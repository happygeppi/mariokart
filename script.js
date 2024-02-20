// TODO:
// test for i,j being off line; check collision!, improve handling (undo)

const SCL = 20;
let DIM = [];
let colors;
let board;

function Start() {
  // dj.createCanvas(DIM[0] * SCL, DIM[1] * SCL);
  dj.createCanvas(FULL);
  dj.bodyBackground(0);
  dj.slower("x");
  dj.faster("y");
  
  Init();
}

function Init() {
  DIM[0] = Math.floor(width / SCL);
  DIM[1] = Math.floor(height / SCL);

  colors = {
    background: new ColorRGB(51, 51, 51),
    track: new ColorRGB(0, 0, 0),
    vel: new ColorRGB(255, 0, 0),
    prev: new ColorRGB(255, 0, 0, 200),
    spawn: new ColorRGB(255, 0, 0),
    goal: new ColorRGB(0, 255, 0),
  };

  board = new Board();
}

function Draw() {
  dj.background(colors.background);

  board.update();
}

class Velocity {
  constructor(from, to) {
    this.a = from;
    this.b = to;
    this.i = to.i - from.i;
    this.j = to.j - from.j;
  }

  update() {
    this.show();
  }

  show(preview = false) {
    dj.stroke(colors.vel);
    dj.strokeWeight(2);

    if (preview) {
      dj.stroke(colors.prev);
      dj.strokeWeight(1);
    }

    dj.line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}

class Point {
  constructor(j, i) {
    this.j = j;
    this.i = i;
    this.x = i * SCL + SCL / 2;
    this.y = j * SCL + SCL / 2;

    this.isOption = false;
    this.isGoal = false;
    this.isCurrent = false;
    this.isSpawn = false;
    this.hovered = false;
  }

  update() {
    this.checkInput();
    this.show();
  }

  checkInput() {
    const mp = Point.rounded(dj.mouse.pos);
    if (mp.i == this.i && mp.j == this.j) {
      this.hovered = true;
      if (dj.mouse.click && board.state == board.doneState && this.isOption) {
        board.nextTurn(this);
      }
    } else this.hovered = false;
  }

  static rounded(pos) {
    return {
      j: Math.round((pos.y - SCL / 2) / SCL),
      i: Math.round((pos.x - SCL / 2) / SCL),
    };
  }

  show() {
    dj.stroke(128);
    dj.strokeWeight(2);

    if (this.isOption) {
      dj.stroke(255);
      dj.strokeWeight(4);
    }
    if (this.isGoal) {
      dj.stroke(colors.goal);
      dj.strokeWeight(6);
    }
    if (this.isCurrent) {
      dj.stroke(colors.vel);
      dj.strokeWeight(4);
    }
    if (this.isSpawn) {
      dj.stroke(colors.spawn);
      dj.strokeWeight(6);
    }
    if (this.hovered) {
      dj.strokeWeight(8);
    }

    dj.point(this.x, this.y);
  }
}

class Track {
  constructor() {
    this.verts = [[], []];
    this.goal = [];
    this.spawn = undefined;
  }

  update() {
    this.checkInput();
    this.show();
  }

  checkInput() {
    if (board.state >= board.doneState) return;

    if (dj.mouse.down && board.state <= 1) {
      if (
        !this.verts[board.state].last() ||
        dj.dist(dj.mouse.pos, this.verts[board.state].last()) > SCL
      ) {
        const p = Point.rounded(dj.mouse.pos);
        const index = p.i + p.j * DIM[0];
        if (!this.verts[board.state].includes(board.grid[index]))
          this.verts[board.state].push(board.grid[index]);
      }
    }

    if (dj.mouse.click) {
      if (board.state == 0 || board.state == 1) return board.state++;

      if (board.state == 2 || board.state == 3) {
        const p = Point.rounded(dj.mouse.pos);
        const index = p.i + p.j * DIM[0];
        const pnt = board.grid[index];
        const g1 = this.goal.last();
        let valid = false;

        if (this.goal.length == 0) {
          valid = true;
          pnt.isGoal = true;
        } else {
          if (pnt.j - g1.j == 0) {
            valid = true;
            const smaller = pnt.i < g1.i ? pnt.i : g1.i;
            const bigger = smaller == pnt.i ? g1.i : pnt.i;

            for (let i = smaller; i <= bigger; i++) {
              board.grid[i + pnt.j * DIM[0]].isGoal = true;
            }
          }
          if (pnt.i - g1.i == 0) {
            valid = true;
            const smaller = pnt.j < g1.j ? pnt.j : g1.j;
            const bigger = smaller == pnt.j ? g1.j : pnt.j;

            for (let j = smaller; j <= bigger; j++) {
              board.grid[pnt.i + j * DIM[0]].isGoal = true;
            }
          }
        }

        if (valid) {
          this.goal.push(pnt);
          return board.state++;
        }
      }

      if (board.state == 4) {
        const p = Point.rounded(dj.mouse.pos);
        const point = board.grid[p.i + p.j * DIM[0]];
        if (!point.isGoal) return;
        this.spawn = point;
        this.spawn.isSpawn = true;
        board.positions[0] = this.spawn;
        board.velocities[0] = new Velocity(this.spawn, this.spawn);
        return board.state++;
      }
    }
  }

  show() {
    dj.stroke(255);
    dj.strokeWeight(2);

    dj.fill(colors.track);
    if (board.state > 0) dj.polygon(this.verts[0], true);
    else dj.lines(this.verts[0]);

    dj.fill(colors.background);
    if (board.state > 1) dj.polygon(this.verts[1], true);
    else dj.lines(this.verts[1]);
  }

  showGoal() {
    dj.stroke(colors.goal);
    dj.strokeWeight(1);
    dj.line(this.goal[0].x, this.goal[0].y, this.goal.last().x, this.goal.last().y);
  }
}

class Board {
  constructor() {
    this.state = 0; // 0: outer, 1: inner, 2: goal.A, 3: goal.B, 4: choose spawn, 5: race
    this.doneState = 5;
    this.grid = this.createGrid();
    this.track = this.createTrack();
    this.positions = [];
    this.velocities = []; // spawn to spawn
  }

  createGrid() {
    let grid = [];
    for (let j = 0; j < DIM[1]; j++) {
      for (let i = 0; i < DIM[0]; i++) {
        grid.push(new Point(j, i));
      }
    }
    return grid;
  }

  createTrack() {
    return new Track();
  }

  update() {
    this.track.update();
    if (this.state >= 4) this.track.showGoal();
    if (this.state == this.doneState) this.show();

    for (const point of this.grid) point.update();
    for (const vel of this.velocities) vel.update();
  }

  show() {
    for (const p of this.grid) p.isOption = false;

    const last = this.positions.last();
    last.isCurrent = true;
    const vel = this.velocities.last();
    const nextPos = this.grid[last.i + vel.i + (last.j + vel.j) * DIM[0]];
    const nextVel = new Velocity(last, nextPos);
    nextVel.show(true);

    for (let j = vel.j - 1; j <= vel.j + 1; j++) {
      for (let i = vel.i - 1; i <= vel.i + 1; i++) {
        const index = last.i + i + (last.j + j) * DIM[0];
        const p = this.grid[index];
        p.isOption = true;
      }
    }
  }

  nextTurn(point) {
    this.velocities.push(new Velocity(this.positions.last(), point));
    this.positions.push(point);
  }
}

Array.prototype.last = function () {
  if (this.length == 0) return undefined;
  return this[this.length - 1];
};
