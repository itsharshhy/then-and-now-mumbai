// A tiny event bus so the React UI and the Phaser world can talk without coupling.
type Handler = (payload: any) => void;

class Bus {
  private handlers = new Map<string, Set<Handler>>();
  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return () => this.off(event, fn);
  }
  off(event: string, fn: Handler) {
    this.handlers.get(event)?.delete(fn);
  }
  emit(event: string, payload?: unknown) {
    this.handlers.get(event)?.forEach((fn) => fn(payload));
  }
}

export const bus = new Bus();

/** Events
 *  year      (number)            React -> game: Time Machine moved
 *  enter     (BuildingId)        game -> React: player walked into a building
 *  near      (BuildingId|null)   game -> React: player is next to a door
 *  pause     (boolean)           React -> game: freeze input while a panel is open
 *  move      (-1|0|1)            React -> game: on-screen touch controls
 *  interact  ()                  React -> game: on-screen "enter" button
 *  player    ({name, shirt})     React -> game: character chosen
 */
