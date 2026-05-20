/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TalentNode, TalentLink, ActiveTab, Graph } from '../types';

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
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const INITIAL_NODES: TalentNode[] = [
  {
    id: "현지훈",
    group: "Me",
    fields: ["HR전략", "프로덕트 총괄", "조합 엔진"],
    fact: "• 전략적 인적자원 네트워크(Project Combination Engine) 기획자\n• 토스(Toss) 스타일 UX 기획 및 설계 리더",
    interpretation: "• 주관과 조화의 탁월한 감각을 지닌 아키텍트\n• 복잡한 휴먼 관계망을 최적의 비즈니스 시너지로 도식화하는 문제 해결사",
    strategicFit: "본 네트워크의 중추이자 허브(Hub)입니다. 모든 자원의 성장에너지와 시너지 효과를 분석하는 오케스트레이터 역할을 수행합니다.",
    energyCost: 1,
  }
];

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [graphs, setGraphs] = useState<Graph[]>(() => {
    const savedGraphs = localStorage.getItem('toss_talent_graphs');
    if (savedGraphs) {
      try {
        const parsed = JSON.parse(savedGraphs);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading graphs localstorage", e);
      }
    }

    // Migration logic for old data
    const legacyNodes = localStorage.getItem('toss_talent_nodes');
    const legacyLinks = localStorage.getItem('toss_talent_links');
    if (legacyNodes) {
      try {
        const parsedNodes = JSON.parse(legacyNodes);
        const parsedLinks = legacyLinks ? JSON.parse(legacyLinks) : [];
        if (Array.isArray(parsedNodes) && parsedNodes.length > 0) {
          return [
            {
              id: 'legacy-main',
              name: '종합 네트워크',
              nodes: parsedNodes,
              links: parsedLinks
            }
          ];
        }
      } catch (e) {
        console.error("Migration error", e);
      }
    }

    // Default template graphs
    return [
      {
        id: 'default-school',
        name: '학교',
        nodes: INITIAL_NODES,
        links: []
      },
      {
        id: 'default-project',
        name: '해커톤',
        nodes: [
          {
            id: "현지훈",
            group: "Me",
            fields: ["HR전략", "프로덕트 총괄", "조합 엔진"],
            fact: "• 전략적 인적자원 네트워크(Project Combination Engine) 기획자\n• 토스(Toss) 스타일 UX 기획 및 설계 리더",
            interpretation: "• 주관과 조화의 탁월한 감각을 지닌 아키텍트\n• 복잡한 휴먼 관계망을 최적의 비즈니스 시너지로 도식화하는 문제 해결사",
            strategicFit: "본 네트워크의 중추이자 허브(Hub)입니다. 모든 자원의 성장에너지와 시너지 효과를 분석하는 오케스트레이터 역할을 수행합니다.",
            energyCost: 1,
          }
        ],
        links: []
      }
    ];
  });

  const [activeGraphId, setActiveGraphId] = useState<string>(() => {
    const savedActive = localStorage.getItem('toss_talent_active_graph_id');
    if (savedActive) {
      return savedActive;
    }
    // Default to first graph
    return 'default-school';
  });

  // Derived current nodes and links
  const activeGraph = graphs.find(g => g.id === activeGraphId) || graphs[0] || {
    id: 'fallback',
    name: '기본 네트워크',
    nodes: INITIAL_NODES,
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

  // Sync to localstorage
  useEffect(() => {
    localStorage.setItem('toss_talent_graphs', JSON.stringify(graphs));
  }, [graphs]);

  useEffect(() => {
    localStorage.setItem('toss_talent_active_graph_id', activeGraphId);
  }, [activeGraphId]);

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
    const newId = `graph-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newGraph: Graph = {
      id: newId,
      name,
      nodes: [
        {
          id: "현지훈",
          group: "Me",
          fields: ["HR전략", "프로덕트 총괄", "조합 엔진"],
          fact: "• 전략적 인적자원 네트워크(Project Combination Engine) 기획자\n• 토스(Toss) 스타일 UX 기획 및 설계 리더",
          interpretation: "• 주관과 조화의 탁월한 감각을 지닌 아키텍트\n• 복잡한 휴먼 관계망을 최적의 비즈니스 시너지로 도식화하는 문제 해결사",
          strategicFit: "본 네트워크의 중추이자 허브(Hub)입니다. 모든 자원의 성장에너지와 시너지 효과를 분석하는 오케스트레이터 역할을 수행합니다.",
          energyCost: 1,
        }
      ],
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
            id: 'default-school',
            name: '학교',
            nodes: INITIAL_NODES,
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
          setActiveGraphId('default-school');
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
    if (id === '현지훈') return; // Cannot delete core user node!
    
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
          nodes: INITIAL_NODES.map(node => ({
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
