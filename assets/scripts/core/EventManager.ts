/** Synchronous, typed lifecycle events; no per-unit timers or engine dependency. */
export class EventManager<T> {
    private listeners = new Set<(event: T) => void>();
    on(listener: (event: T) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(event: T): void { this.listeners.forEach(listener => listener(event)); }
    clear(): void { this.listeners.clear(); }
}
