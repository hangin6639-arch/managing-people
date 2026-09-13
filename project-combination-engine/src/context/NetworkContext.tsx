/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TalentNode, TalentLink, ActiveTab, Graph } from '../types';
import { useAuth } from './AuthContext';

interface NetworkContextType {
  nodes: TalentNode[];
  links: TalentLink[];
  selectedNode: TalentNode | null;
  activeTab: ActiveTab;
  theme: 'light' | 'dark';
  
  // Multi-Graph System properties
  graphs: Graph[];
  activeGraphId: string;
  addGraph: (name: string) => string;
  deleteGraph: (id: string) => void;
  updateGraphName: (id: string, name: string) => void;
  setActiveGraphId: (id: string) => void;
  
  // Actions
  addNode: (node: TalentNode, connection?: { targetId: string; relationshipType: string; strength: number }, targetGraphId?: string) => boolean;
  updateNode: (id: string, updated: Partial<TalentNode>) => void;
  deleteNode: (id: string) => void;
  addLink: (link: TalentLink, targetGraphId?: string) => void;
  deleteLink: (source: string, target: string) => void;
  setSelectedNode: (node: TalentNode | null) => void;
  setActiveTab: (tab: ActiveTab) => void;
  toggleTheme: () => void;
  resetAll: () => void;
  coreNodeId: string;
  planError: string | null;
  clearPlanError: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const initialNode = (name: string): TalentNode => ({
    id: name,
    group: "Me",
    fields: [],
    fact: "내 프로필입니다. 카드를 열어 이력과 관심 분야를 입력해보세요.",
    interpretation: "",
    strategicFit: "이 네트워크의 중심 인물입니다.",
    energyCost: 1,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const coreNodeId = user!.name;
  const [graphs, setGraphs] = useState<Graph[]>([{ id: 'default-network', name: '내 네트워크', nodes: [initialNode(coreNodeId)], links: [] }]);
  const [vaultLoaded, setVaultLoaded] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const personalizeGraphs = (items: Graph[]): Graph[] => items.map(graph => {
    const previousCore = graph.nodes.find(node => node.group === 'Me')?.id;
    if (!previousCore || previousCore === coreNodeId) return graph;
    return {
      ...graph,
      nodes: graph.nodes.map(node => node.id === previousCore ? { ...node, id: coreNodeId } : node),
      links: graph.links.map(link => ({
        ...link,
        source: link.source === previousCore ? coreNodeId : link.source,
        target: link.target === previousCore ? coreNodeId : link.target,
      })),
    };
  });

  const [activeGraphId, setActiveGraphId] = useState<string>('default-network');

  // Derived current nodes and links
  const activeGraph = graphs.find(g => g.id === activeGraphId) || graphs[0] || {
    id: 'fallback',
    name: '기본 네트워크',
    nodes: [initialNode(coreNodeId)],
    links: []
  };

  const nodes = activeGraph.nodes;
  const links = activeGraph.links;

  const [selectedNode, setSelectedNodeState] = useState<TalentNode | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('toss_talent_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  // Keep references updated for bottom sheet when raw nodes change
  const setSelectedNode = (node: TalentNode | null) => {
    if (!node) {
      setSelectedNodeState(null);
    } else {
      const freshNode = nodes.find(n => n.id === node.id);
      setSelectedNodeState(freshNode || node);
    }
  };

  // Load the signed-in user's encrypted server vault. Existing browser data is migrated once.
  useEffect(() => {
    fetch('/api/vault').then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(vault => {
      const legacyRaw = localStorage.getItem('toss_talent_graphs');
      const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
      if (Array.isArray(vault.graphs) && vault.graphs.length) { setGraphs(personalizeGraphs(vault.graphs)); setActiveGraphId(vault.activeGraphId || vault.graphs[0].id); }
      else if (Array.isArray(legacy) && legacy.length) { setGraphs(personalizeGraphs(legacy)); setActiveGraphId(legacy[0].id); }
      localStorage.removeItem('toss_talent_graphs'); localStorage.removeItem('toss_talent_nodes'); localStorage.removeItem('toss_talent_links'); localStorage.removeItem('toss_talent_active_graph_id');
    }).catch(() => setPlanError('저장된 네트워크를 불러오지 못했습니다.')).finally(() => setVaultLoaded(true));
  }, []);

  useEffect(() => {
    if (!vaultLoaded) return;
    const timer = window.setTimeout(() => fetch('/api/vault', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ graphs, activeGraphId }) }).then(async response => { if (!response.ok) { const body = await response.json(); throw new Error(body.error); } }).catch(error => setPlanError(error.message || '변경 내용을 저장하지 못했습니다.')), 350);
    return () => window.clearTimeout(timer);
  }, [graphs, activeGraphId, vaultLoaded]);

  useEffect(() => {
    localStorage.setItem('toss_talent_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Add Graph action
  const addGraph = (name: string): string => {
    if (graphs.length >= user!.limits.graphs) { setPlanError(`Free 요금제에서는 네트워크를 ${user!.limits.graphs}개까지 만들 수 있습니다.`); return ''; }
    const newId = `graph-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newGraph: Graph = {
      id: newId,
      name,
      nodes: [initialNode(coreNodeId)],
      links: []
    };
    setGraphs(prev => [...prev, newGraph]);
    setActiveGraphId(newId);
    return newId;
  };

  // Delete Graph action
  const deleteGraph = (id: string) => {
    setGraphs(prev => {
      const filtered = prev.filter(g => g.id !== id);
      if (filtered.length === 0) {
        return [
          {
            id: 'default-network',
            name: '내 네트워크',
            nodes: [initialNode(coreNodeId)],
            links: []
          }
        ];
      }
      return filtered;
    });

    if (activeGraphId === id) {
      setGraphs(current => {
        const remaining = current.filter(g => g.id !== id);
        if (remaining.length > 0) {
          setActiveGraphId(remaining[0].id);
        } else {
          setActiveGraphId('default-network');
        }
        return current;
      });
    }
  };

  // Update Graph Name action
  const updateGraphName = (id: string, name: string) => {
    setGraphs(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, name };
      }
      return g;
    }));
  };

  const addNode = (
    node: TalentNode, 
    connection?: { targetId: string; relationshipType: string; strength: number },
    targetGraphId?: string
  ): boolean => {
    const destGraphId = targetGraphId || activeGraphId;
    const destination = graphs.find(graph => graph.id === destGraphId);
    if (destination && destination.nodes.length >= user!.limits.peoplePerGraph) { setPlanError(`현재 요금제에서는 네트워크당 인물을 ${user!.limits.peoplePerGraph}명까지 저장할 수 있습니다.`); return false; }
    let duplicated = false;

    setGraphs(prev => prev.map(g => {
      if (g.id === destGraphId) {
        if (g.nodes.some(n => n.id.trim() === node.id.trim())) {
          duplicated = true;
          return g;
        }

        const newNode: TalentNode = {
          ...node,
          // Randomize visual anchor position slightly near center for force layout entry
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
          y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
        };

        const updatedNodes = [...g.nodes, newNode];
        let updatedLinks = [...g.links];

        if (connection && connection.targetId) {
          const newLink: TalentLink = {
            source: newNode.id,
            target: connection.targetId,
            relationshipType: connection.relationshipType || '협업 관계',
            strength: connection.strength || 2,
          };
          updatedLinks.push(newLink);
        }

        return {
          ...g,
          nodes: updatedNodes,
          links: updatedLinks
        };
      }
      return g;
    }));

    return !duplicated;
  };

  const updateNode = (id: string, updated: Partial<TalentNode>) => {
    setGraphs(prev => prev.map(g => {
      if (g.id === activeGraphId) {
        const updatedNodes = g.nodes.map(node => {
          if (node.id === id) {
            const fresh = { ...node, ...updated };
            if (selectedNode && selectedNode.id === id) {
              setSelectedNodeState(fresh);
            }
            return fresh;
          }
          return node;
        });
        return { ...g, nodes: updatedNodes };
      }
      return g;
    }));
  };

  const deleteNode = (id: string) => {
    if (id === coreNodeId) return;
    
    setGraphs(prev => prev.map(g => {
      if (g.id === activeGraphId) {
        const updatedNodes = g.nodes.filter(n => n.id !== id);
        const updatedLinks = g.links.filter(link => {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          return sourceId !== id && targetId !== id;
        });
        return { ...g, nodes: updatedNodes, links: updatedLinks };
      }
      return g;
    }));
    
    if (selectedNode && selectedNode.id === id) {
      setSelectedNodeState(null);
    }
  };

  const addLink = (link: TalentLink, targetGraphId?: string) => {
    const destGraphId = targetGraphId || activeGraphId;
    setGraphs(prev => prev.map(g => {
      if (g.id === destGraphId) {
        // Check if link already exists
        const exists = g.links.some(l => {
          const s1 = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t1 = typeof l.target === 'object' ? (l.target as any).id : l.target;
          const s2 = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const t2 = typeof link.target === 'object' ? (link.target as any).id : link.target;
          return (s1 === s2 && t1 === t2) || (s1 === t2 && t1 === s2);
        });

        if (!exists) {
          return {
            ...g,
            links: [...g.links, link]
          };
        }
      }
      return g;
    }));
  };

  const deleteLink = (source: string, target: string) => {
    setGraphs(prev => prev.map(g => {
      if (g.id === activeGraphId) {
        const updatedLinks = g.links.filter(l => {
          const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return !(s === source && t === target) && !(s === target && t === source);
        });
        return {
          ...g,
          links: updatedLinks
        };
      }
      return g;
    }));
  };

  const resetAll = () => {
    setGraphs(prev => prev.map(g => {
      if (g.id === activeGraphId) {
        return {
          ...g,
          nodes: [initialNode(coreNodeId)].map(node => ({
            ...node,
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
          })),
          links: []
        };
      }
      return g;
    }));
    setSelectedNodeState(null);
    setActiveTab('directory');
  };

  return (
    <NetworkContext.Provider value={{
      nodes,
      links,
      selectedNode,
      activeTab,
      theme,
      graphs,
      activeGraphId,
      addGraph,
      deleteGraph,
      updateGraphName,
      setActiveGraphId,
      addNode,
      updateNode,
      deleteNode,
      addLink,
      deleteLink,
      setSelectedNode,
      setActiveTab,
      toggleTheme,
      resetAll,
      coreNodeId,
      planError,
      clearPlanError: () => setPlanError(null),
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
