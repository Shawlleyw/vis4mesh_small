import * as d3 from "d3";

class Switch {
  id: number;
  x: number;
  y: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }
}

class Minimap {
  scale: number = 1024;
  offset_x: number = 0;
  offset_y: number = 0;
  ratio: number;

  constructor() {
    const canvas = d3.select<SVGSVGElement, unknown>("#canvas");
    const canvas_width = canvas.node()!.clientWidth;
    const canvas_height = canvas.node()!.clientHeight;
    this.ratio = canvas_width / canvas_height;
  }

  draw(tile_width: number, tile_height: number) {
    const canvas_height = 150;
    const canvas_width = canvas_height * this.ratio;

    d3.select("#minimap")
    .style("width", canvas_width)
    .style("height", canvas_height);

    const width_scale = canvas_width / tile_width;
    const height_scale = canvas_height / tile_height;
    this.scale = Math.min(width_scale, height_scale) * 0.9;

    this.offset_x = canvas_width / 2 - (tile_width / 2) * this.scale;
    this.offset_y = canvas_height / 2 - (tile_height / 2) * this.scale;

    const wafer_mini = d3.select("#wafer-mini");
    wafer_mini
      .attr("x", this.offset_x)
      .attr("y", this.offset_y)
      .attr("width", tile_width * this.scale)
      .attr("height", tile_height * this.scale)
      .attr("fill", "white")
      .attr("stroke", "blue");
  }

  update_minimap_viewport_box(
    top: number,
    left: number,
    width: number,
    height: number
  ) {
    const viewport_box = d3.select("#minimap-viewport-box");

    viewport_box
      .attr("x", left * this.scale + this.offset_x)
      .attr("y", top * this.scale + this.offset_y)
      .attr("width", width * this.scale)
      .attr("height", height * this.scale)
      .attr("fill", "none")
      .attr("stroke", "green");
  }
}

class MainView {
  minimap: Minimap;
  tile_width: number;
  tile_height: number;
  switches: Switch[][];
  scale: number = 0; // abstract node, size of scale*scale
  min_x: number = 0;
  max_x: number = 0;
  min_y: number = 0;
  max_y: number = 0;
  rect_size: number = 0; // reassign each time by this.draw()
  readonly node_size_ratio = 0.6;
  readonly grid = d3.select("#grid");

  constructor(minimap: Minimap, switches: Switch[][]) {
    this.minimap = minimap;
    this.tile_width = switches[0].length;
    this.tile_height = switches.length;
    this.switches = switches;
  }

  // center based, each center is (i, j) + (scale/2, scale/2)
  within_view(i_height: number, j_width: number): boolean {
    let center_y = i_height + this.scale / 2;
    let center_x = j_width + this.scale / 2;
    let top = center_y - this.rect_size / 2;
    let bottom = top + this.rect_size;
    let left = center_x - this.rect_size / 2;
    let right = left + this.rect_size;
    return (
      bottom >= this.min_y &&
      top <= this.max_y &&
      right >= this.min_x &&
      left <= this.max_x
    );
  }

  // reassign this.rect_size to suit the window before draw
  get_rect_size() {
    this.rect_size = this.scale * this.node_size_ratio;
  }

  get_masked_node() {
    let filtered_switches: Switch[] = [];
    for (let i = 0; i < this.tile_height; i += this.scale) {
      for (let j = 0; j < this.tile_width; j += this.scale) {
        if (this.within_view(i, j)) {
          filtered_switches.push(this.switches[i][j]);
        }
      }
    }
    return filtered_switches;
  }
  
  draw_rect(filtered_switches: Switch[]) {
    this.grid
      .selectAll("rect")
      .data(filtered_switches)
      .join(
        (enter) => enter.append("rect"),
        (update) => update,
        (end) => end.remove()
      )
      .attr("x", (d) => d.x + this.scale / 2 - this.rect_size / 2)
      .attr("y", (d) => d.y + this.scale / 2 - this.rect_size / 2)
      .attr("width", (d) => this.rect_size)
      .attr("height", (d) => this.rect_size)
      .attr("fill", "white")
      .attr("stroke", "blue")
      .attr("stroke-width", this.scale * 0.02);
  }

  // draw_text(filtered_switches: Switch[]) {
  //   this.grid
  //     .selectAll("text")
  //     .data(filtered_switches)
  //     .join(
  //       function (enter) {
  //         return enter.append("text");
  //       },
  //       function (update) {
  //         return update;
  //       },
  //       function (exit) {
  //         return exit.remove();
  //       }
  //     )
  //     .attr("x", (d) => d.x - this.node_size / 2)
  //     .attr("y", (d) => d.y)
  //     .attr("font-size", this.rect_size / 5)
  //     .text((d) => `${d.x}, ${d.y}`);
  // }

  draw() {
    this.get_rect_size(); // get rectangle size
    const filtered_switches = this.get_masked_node();

    this.draw_rect(filtered_switches);
    // this.draw_text(filtered_switches);

    // console.log("draw mesh ", this.scale);
  }

  initial_transform_param(
    canvas_width: number,
    canvas_height: number
  ): [number[], number] {
    const scale_x = canvas_width / this.tile_width;
    const scale_y = canvas_height / this.tile_height;
    const scale = Math.min(scale_x, scale_y) * 0.9;

    const translate_x = canvas_width / 2 - (this.tile_width / 2) * scale;
    const translate_y = canvas_height / 2 - (this.tile_height / 2) * scale;

    return [[translate_x, translate_y], scale];
  }

  initialize_zoom() {
    const canvas = d3.select<SVGSVGElement, unknown>("#canvas");

    const canvas_width = canvas.node()!.clientWidth;
    const canvas_height = canvas.node()!.clientHeight;
    console.log(canvas_width, canvas_height);

    const [initial_translate, initial_scale] = this.initial_transform_param(
      canvas_width,
      canvas_height
    );
    console.log(initial_translate);
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>();
    // .translateExtent([[-initial_translate[0], -initial_translate[1]],
    //   [-initial_translate[0]+canvas_width, -initial_translate[1]+canvas_height]])
    // .scaleExtent([initial_scale, 1024]);
    canvas
      .call(
        zoomBehavior.on("zoom", (e) => {
          this.update_zoom(e.transform);
          console.log(e.transform);
        })
      )
      .call(
        zoomBehavior.transform,
        d3.zoomIdentity
          .translate(initial_translate[0], initial_translate[1])
          .scale(initial_scale)
      );
  }

  update_zoom(transform: d3.ZoomTransform) {
    const canvas = d3.select<SVGSVGElement, unknown>("#canvas");

    this.grid.attr("transform", transform.toString());

    const top_left = this.reverse_mapping([0, 0], transform);
    const bottom_right = this.reverse_mapping(
      [canvas.node()!.clientWidth, canvas.node()!.clientHeight],
      transform
    );
    const viewport_width = bottom_right[0] - top_left[0];
    const viewport_height = bottom_right[1] - top_left[1];

    this.min_x = top_left[0];
    this.max_x = bottom_right[0];
    this.min_y = top_left[1];
    this.max_y = bottom_right[1];

    this.minimap.update_minimap_viewport_box(
      top_left[1],
      top_left[0],
      viewport_width,
      viewport_height
    );

    this.update_semantic_zoom(viewport_width, viewport_height);
    // console.log(viewport_height, viewport_width);
  }

  update_semantic_zoom(width: number, height: number) {
    let count = width * height;
    this.scale = 1;
    while (count > 500) {
      // At most 1000 nodes
      count /= 16;
      this.scale *= 4;
    }
    // console.log(this.scale);

    this.draw();
  }

  reverse_mapping(coord: number[], transform: d3.ZoomTransform): number[] {
    const scale = transform.k;
    const translate_x = transform.x;
    const translate_y = transform.y;

    const x_ = (coord[0] - translate_x) / scale;
    const y_ = (coord[1] - translate_y) / scale;

    return [x_, y_];
  }
}

function generate_data(width: number, height: number): Switch[][] {
  const switches: Switch[][] = [];
  for (let i = 0; i < height; i++) {
    switches.push([]);
    for (let j = 0; j < width; j++) {
      switches[i].push(new Switch(i * width + j, j, i));
    }
  }

  return switches;
}

document.addEventListener("DOMContentLoaded", (event) => {
  const tile_width = 1024;
  const tile_height = 1024;
  console.log("DOMCoententLoaded");

  const switches = generate_data(tile_width, tile_height);

  const minimap = new Minimap();
  minimap.draw(tile_width, tile_height);

  const main_view = new MainView(minimap, switches);
  // main_view.draw();
  main_view.initialize_zoom();
});
