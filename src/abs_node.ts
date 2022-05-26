

export interface abs_node {
  x: number;
  y: number;
}

export class abs_layer {
  scale: number;
  height: number;
  width: number;
  nodes: abs_node[][];

  constructor(scale: number, height: number, width: number) {
    this.scale = scale;
    this.height = height;
    this.width = width;
    this.nodes = [];
    for (let i = 0; i < height; i++) {
      let row: abs_node[] = [];
      for (let j = 0; j < width; j++) {
        row.push({ x: i, y: j });
      }
      this.nodes.push(row);
    }
  }
}
