/** A single sample from a time-domain simulation. `position`/`velocity` units depend on the simulator (see its docstring). */
export interface SimTracePoint {
  tSeconds: number;
  position: number;
  velocity: number;
}
