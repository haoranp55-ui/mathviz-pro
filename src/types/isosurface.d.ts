declare module 'isosurface' {
  interface IsosurfaceMesh {
    positions: number[][];
    cells: number[][];
  }

  interface IsosurfaceAPI {
    marchingCubes(
      dims: [number, number, number],
      potential: (x: number, y: number, z: number) => number,
      bounds?: [[number, number, number], [number, number, number]],
    ): IsosurfaceMesh;

    surfaceNets(
      dims: [number, number, number],
      potential: (x: number, y: number, z: number) => number,
      bounds?: [[number, number, number], [number, number, number]],
    ): IsosurfaceMesh;

    marchingTetrahedra(
      dims: [number, number, number],
      potential: (x: number, y: number, z: number) => number,
      bounds?: [[number, number, number], [number, number, number]],
    ): IsosurfaceMesh;
  }

  const api: IsosurfaceAPI;
  export default api;
}
