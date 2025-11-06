// utils/quantumEffects.ts
import gsap from 'gsap';
import { AgentType } from '../types';
// Add React import for React.RefObject type usage
import React from 'react';

export function quantumNotify(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  const notification = document.createElement('div');
  notification.textContent = message;
  let bgColor: string;
  let textColor: string = 'text-white';

  switch (type) {
    case 'success':
      bgColor = 'bg-accent-color';
      textColor = 'text-black';
      break;
    case 'warn':
      bgColor = 'bg-warn-bg';
      textColor = 'text-panel-bg'; // Original `3a3c31` which is `panel-bg`
      break;
    case 'error':
      bgColor = 'bg-err-color';
      break;
    case 'info':
    default:
      bgColor = 'bg-info-color';
      break;
  }

  notification.className = `fixed top-5 right-5 ${bgColor} ${textColor} p-3 rounded-md z-[1000] text-xs shadow-lg`;
  document.body.appendChild(notification);

  gsap.fromTo(notification,
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.3 }
  );

  setTimeout(() => {
    gsap.to(notification, {
      opacity: 0, y: -20, duration: 0.3, onComplete: () => {
        document.body.removeChild(notification);
      }
    });
  }, 3000);
}

export function initQuantumThreads(containerRef: React.RefObject<HTMLDivElement>): () => void {
  const container = containerRef.current;
  if (!container) return () => {};

  container.innerHTML = '';
  const threads: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) {
    const thread = document.createElement('div');
    thread.className = 'absolute w-[1px] h-full bg-gradient-to-b from-transparent via-agent-nexus to-transparent animate-[threadFlow_2s_infinite_linear]';
    thread.style.left = `${20 + i * 15}%`;
    thread.style.animationDelay = `${i * 0.3}s`;
    container.appendChild(thread);
    threads.push(thread);
  }

  return () => {
    threads.forEach(thread => container.removeChild(thread));
  };
}

export function createFractalNodes(containerRef: React.RefObject<HTMLDivElement>, quantumMode: boolean, hyperthreading: boolean): () => void {
  const container = containerRef.current;
  if (!container || !quantumMode) {
    if (container) container.innerHTML = '';
    return () => {};
  }

  container.innerHTML = '';
  const nodeCount = hyperthreading ? 12 : 6;
  const nodes: HTMLElement[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const node = document.createElement('div');
    node.className = 'absolute w-1 h-1 rounded-full animate-[fractalPulse_1.5s_infinite_alternate]';
    node.style.left = `${Math.random() * 100}%`;
    node.style.top = `${Math.random() * 100}%`;
    node.style.animationDelay = `${Math.random() * 2}s`;
    node.style.backgroundColor = i % 2 === 0 ? 'var(--agent-nexus)' : 'var(--agent-cognito)';
    container.appendChild(node);
    nodes.push(node);
  }

  return () => {
    nodes.forEach(node => container.removeChild(node));
  };
}

export function animateAgentCard(agentType: AgentType, active: boolean): void {
  const agentCard = document.getElementById(`${agentType}-card`);
  if (agentCard) {
    if (active) {
      agentCard.classList.add('active');
      gsap.fromTo(agentCard.querySelector('::before'),
        { left: '-100%' },
        { left: '100%', duration: 0.5, ease: 'power1.out', overwrite: true }
      );
    } else {
      agentCard.classList.remove('active');
    }
  }
}