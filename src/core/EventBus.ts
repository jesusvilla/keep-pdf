type EventHandler = (...args: any[]) => void

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map()

  on(eventName: string, handler: EventHandler): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, [])
    }
    this.listeners.get(eventName)!.push(handler)
  }

  off(eventName: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventName)
    if (!handlers) return
    const index = handlers.indexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
  }

  dispatch(eventName: string, data?: any): void {
    const handlers = this.listeners.get(eventName)
    if (!handlers) return
    for (const handler of handlers) {
      handler(data)
    }
  }
}
