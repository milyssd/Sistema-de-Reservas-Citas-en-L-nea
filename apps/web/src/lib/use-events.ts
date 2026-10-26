'use client';
import { useEffect, useRef } from 'react';
import { API_URL, authHeaders } from './api';
/** Authenticated SSE uses fetch so access tokens stay in headers and never enter URLs. */
export function useEvents(path: string, onChange: () => void, enabled = true) {
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous: string | undefined;
    async function connect() {
      try {
        const response = await fetch(`${API_URL}${path}`, {
          credentials: 'include',
          headers: { ...authHeaders(), Accept: 'text/event-stream' },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok || !response.body) throw new Error('Stream unavailable');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = event
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');
            if (data) {
              if (previous !== undefined && previous !== data) callback.current();
              previous = data;
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void connect(), 5000);
    }
    void connect();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [path, enabled]);
}
