import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  html: string;
  className?: string;
}

/**
 * Renders HTML content with LaTeX math expressions.
 * Supports both inline ($...$) and display ($$...$$) math.
 */
export function MathRenderer({ html, className }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !html) return;

    // First set the raw HTML
    containerRef.current.innerHTML = html;

    // Then find and render all LaTeX expressions in text nodes
    renderMathInElement(containerRef.current);
  }, [html]);

  return <div ref={containerRef} className={className} />;
}

function renderMathInElement(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && /\$/.test(node.textContent)) {
      textNodes.push(node);
    }
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    const fragment = document.createDocumentFragment();

    // Match $$...$$ (display) and $...$ (inline), avoiding escaped \$
    const regex = /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }

      const latex = match[1] || match[2]; // display or inline
      const isDisplay = match[1] !== undefined;

      try {
        const span = document.createElement(isDisplay ? 'div' : 'span');
        katex.render(latex, span, {
          throwOnError: false,
          displayMode: isDisplay,
        });
        fragment.appendChild(span);
      } catch {
        // Fallback: show raw text
        fragment.appendChild(document.createTextNode(match[0]));
      }

      lastIndex = match.index + match[0].length;
    }

    // Only replace if we found math
    if (lastIndex > 0) {
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }
}
