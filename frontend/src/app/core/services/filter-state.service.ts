import { Injectable, WritableSignal, signal, untracked } from '@angular/core';

const STORAGE_PREFIX = 'sm_filters_';

/** Conversores opcionais para valores que não sobrevivem ao JSON (ex.: Date). */
export interface PersistentOptions<T> {
  serialize?: (value: T) => unknown;
  deserialize?: (raw: unknown) => T;
}

/**
 * Fábrica de signals persistentes para filtros de tela.
 *
 * Mesmo padrão do MonthStateService: o valor vive no sessionStorage enquanto
 * a aba estiver aberta (e o usuário logado). Como o serviço é singleton, a
 * mesma instância de signal é devolvida quando o componente é recriado ao
 * navegar entre páginas — o estado dos filtros não se perde.
 */
@Injectable({ providedIn: 'root' })
export class FilterStateService {
  private readonly signals = new Map<string, WritableSignal<unknown>>();

  persistent<T>(key: string, initial: T, options?: PersistentOptions<T>): WritableSignal<T> {
    const cached = this.signals.get(key);
    if (cached) return cached as WritableSignal<T>;

    const storageKey = STORAGE_PREFIX + key;
    let value = initial;
    const raw = sessionStorage.getItem(storageKey);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        value = options?.deserialize ? options.deserialize(parsed) : (parsed as T);
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    }

    const sig = signal<T>(value);
    const originalSet = sig.set.bind(sig);
    sig.set = (v: T) => {
      originalSet(v);
      // Signals órfãos (descartados por clearAll no logout) não voltam a gravar:
      // uma resposta HTTP tardia ressuscitaria filtros da sessão anterior.
      if (this.signals.get(key) !== sig) return;
      const toStore = options?.serialize ? options.serialize(v) : v;
      sessionStorage.setItem(storageKey, JSON.stringify(toStore));
    };
    sig.update = (fn: (v: T) => T) => sig.set(fn(untracked(sig)));

    this.signals.set(key, sig);
    return sig;
  }

  /** Indica se já existe valor salvo para a chave (útil para defaults assíncronos). */
  has(key: string): boolean {
    return sessionStorage.getItem(STORAGE_PREFIX + key) !== null;
  }

  /** Remove todos os filtros salvos e o cache de signals (chamado no logout). */
  clearAll(): void {
    this.signals.clear();
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  }
}
