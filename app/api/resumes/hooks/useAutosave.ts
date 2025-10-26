// useAutosave.ts (essentials)
import isEqual from "fast-deep-equal";
import debounce from "lodash.debounce";
import React from "react";

export function useAutosave({
  key, data, save, delay = 1200, minInterval = 4000, enabled = true
}: {
  key: string;
  data: any;
  save: (d:any)=>Promise<void>|void;
  delay?: number;
  minInterval?: number;
  enabled?: boolean;
}) {
  const lastSaved = React.useRef<any>(null);
  const lastSavedAt = React.useRef(0);
  const debounced = React.useMemo(() => debounce(async (current:any) => {
    if (lastSaved.current && isEqual(current, lastSaved.current)) return;
    if (Date.now() - lastSavedAt.current < minInterval) return;
    await save(current);
    lastSaved.current = current;
    lastSavedAt.current = Date.now();
  }, delay), [delay, minInterval, save]);

  React.useEffect(() => () => debounced.cancel(), [debounced]);

  const prev = React.useRef<any>(null);
  React.useEffect(() => {
    if (!enabled) return;
    if (prev.current && isEqual(prev.current, data)) return;
    prev.current = data;
    debounced(data);
  }, [data, enabled, debounced]);

  const saveNow = async () => {
    debounced.cancel();
    await save(data);
    lastSaved.current = data;
    lastSavedAt.current = Date.now();
  };

  return { saveNow };
}
