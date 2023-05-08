class Bag {
    private preview: Sprite
    private contents: number[]

    constructor() {
        let full = false
        this.contents = []
        this.fill()
        this.preview = sprites.create(image.create(4 * CELL_SIZE, 15 * CELL_SIZE))
        this.preview.setPosition(134, 73)
    }

    private fill() {
        let full = false
        while (!full) {
            let rnd = Math.randomRange(0, 6)
            if (this.contents.indexOf(rnd) == -1) {
                this.contents.push(rnd)
            }
            if (this.contents.length == 7) {
                full = true
            }
        }
    }

    private updateQueue() {
        this.preview.image.fill(0)
        for (let i = 0; i < 3; i++) {
            this.preview.image.drawImage(shapes[this.contents[i]], 0, i * 20 + 5)
        }
    }

    deal(): number {
        let next = this.contents.shift()
        if (this.contents.length < NEXT_PIECES) {
            this.fill()
        }
        this.updateQueue()
        return next
    }
}

class Tetrimino {
    colors: number[][]
    piece: Sprite
    rotation: number
    shapeID: number
    x: number
    y: number
    w: number
    h: number
    left: number
    right: number
    bottom: number
    offsets: number[]

    private ghost_piece: Sprite

    private print_well(well: Well) {
        for (let i = 0; i < MATRIX_HEIGHT; i++) {
            let s = "| "
            for (let j = 0; j < MATRIX_WIDTH; j++) {
                if (well.colors[i][j] == undefined) {
                    s += "  | "
                } else {
                    s += well.colors[i][j] + " | "
                }
            }
            console.log(s)
        }
    }

    private getColorsArray(): number[][] {
        let result: number[][] = []
        let img = this.piece.image
        let s = img.width / CELL_SIZE
        let left_offset = 0
        for (let y = 0; y < s; y++) {
            result.push([])
            for (let x = 0; x < s; x++) {
                let color = img.getPixel(x * CELL_SIZE, y * CELL_SIZE)
                result[y].push(color)
            }
        }
        return result
    }

    private spawn_ghost() {
        let img = shapes[this.shapeID + 7]
        if (this.rotation != 0) {
            img = img.rotated(this.rotation * 90)
        }
        this.ghost_piece.setImage(img)
        this.sonar(well)
        let x = X0 + (this.x * CELL_SIZE + this.ghost_piece.width / 2)
        let y = Y0 + (this.bottom * CELL_SIZE + this.ghost_piece.height / 2)
        this.ghost_piece.setPosition(x, y)
    }

    constructor() {
        this.spawn()
    }
    
    spawn() {
        // Сreates new piece at the start of the game / after locking
        this.shapeID = bag.deal()
        this.offsets = offsets[this.shapeID]
        this.x = (this.shapeID == 3) ? 4 : 3
        this.y = 0
        this.w = (this.shapeID == 0) ? 4 : (this.shapeID == 3 ? 2 : 3)
        this.left = this.x
        this.right = this.x + this.w
        this.piece = sprites.create(image.create(0, 0))
        this.piece.z = 2
        this.ghost_piece = sprites.create(image.create(0, 0))
        this.ghost_piece.z = 1
        this.respawnAt(this.x, this.y, Rotation.Z)
    }

    respawnAt(new_x: number, new_y: number, r: number) {
        // Respawns and updates the rotation of the existing piece at the new location
        this.x = new_x
        this.y = new_y
        this.rotation = r
        let img = shapes[this.shapeID]
        if (this.rotation != 0) {
            img = img.rotated(this.rotation * 90)
        }
        this.piece.setImage(img)
        this.colors = this.getColorsArray()
        this.h = this.colors[0].length - this.offsets[2]
        this.bottom = MATRIX_HEIGHT - this.h
        let x = X0 + (this.x * CELL_SIZE + this.piece.width / 2)
        let y = Y0 + (this.y * CELL_SIZE + this.piece.height / 2)
        this.piece.setPosition(x, y)
        this.spawn_ghost()
    }

    strafe(x_inc: number) {
        let new_x = this.x + x_inc
        if (!this.collision(new_x, this.y, this.rotation)) {
            this.respawnAt(new_x, this.y, this.rotation)
        }
    }

    sonar(well: Well) {
        let lowest_x = this.x
        while (!this.collision(lowest_x, this.y, this.rotation) && lowest_x < MATRIX_HEIGHT) {
            lowest_x++
        }
        this.bottom = lowest_x
    }

    rotate(cw: boolean) {
        let next_rotation = 0
        if (cw) {
            next_rotation = (this.rotation == 3) ? 0 : this.rotation + 1
            let elm = this.offsets.pop()
            this.offsets.unshift(elm)
        } else {
            next_rotation = (this.rotation == 0) ? 3 : this.rotation - 1
            let elm = this.offsets.shift()
            this.offsets.push(elm)         
        }
        let canRotate = true // wall kicks to be added later
        let kick_x = 0
        let kick_y = 0
        //console.log(this.offsets[0] +" "+ this.offsets[1] +" "+ this.offsets[2] +" "+ this.offsets[3])
        if (canRotate) {
            this.respawnAt(this.x + kick_x, this.y + kick_y, next_rotation)
        }
    }

    drop(hard: boolean) {
        this.respawnAt(this.x, (hard ? this.bottom : this.y + 1), this.rotation)
        if (this.y == this.bottom) {
            this.lock(well)
        }
    }

    lock(well: Well) {
        for (let row = this.offsets[0]; row < this.offsets[2]; row++) {
            for (let col = this.offsets[3]; col < this.offsets[1]; col++) {
                if (this.colors[row][col] != 0) {
                    well.changeColor(this.x + col, this.y + row, this.colors[row][col])
                }
            }
        }
        this.spawn()
        well.update()
        //this.print_well(well)
    }

    collision(new_x: number, new_y: number, new_rotation: number): boolean {
        if (new_x + this.offsets[3] < 0 || new_x + this.w - this.offsets[1] > MATRIX_WIDTH) {
            return true
        } else {
            return false
        }
    }
}

class Well {
    matrix: Sprite
    colors: number[][]
    w: number
    h: number

    constructor() {
        this.colors = []
        this.w = MATRIX_WIDTH * CELL_SIZE
        this.h = MATRIX_HEIGHT * CELL_SIZE
        for (let i = 0; i < MATRIX_HEIGHT; i++) {
            this.colors.push([])
            for (let j = 0; j < MATRIX_WIDTH; j++) {
                this.colors[i].push(0)
            }
        }
        this.matrix = sprites.create(image.create(this.w, this.h))
        this.matrix.setPosition(X0 + this.w / 2, Y0 + this.h / 2)
        this.matrix.image.fill(0)
    }

    changeColor(x: number, y: number, c: number) {
        this.colors[y][x] = c
    }

    update() {
        this.matrix.image.fill(0)
        for (let row = 0; row < MATRIX_HEIGHT; row++) {
            for (let col = 0; col < MATRIX_WIDTH; col++) {
                if (this.colors[row][col] != undefined && this.colors[row][col] != null) {
                    this.matrix.image.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE, this.colors[row][col])
                }
            }
        }
    }

    row(i: number): number[] {
        let result = []
        for (let j = 0; j < MATRIX_WIDTH; j++) {
            result.push(this.colors[i][j])
        }
        return result
    }

    col(j: number): number[] {
        let result = []
        for (let i = 0; i < MATRIX_HEIGHT; i++) {
            result.push(this.colors[i][j])
        }
        return result
    }

}

// EXT. FUNCTIONS -----------------------------------------

function updateStats() {

    sScore.setText(score.toString())
    sLevel.setText(level.toString())
    sLines.setText(lines.toString())
    sHighscore.setText(highscore.toString())
    sLevel.setPosition(6 + sLevel.width / 2, 47 + sLevel.height / 2)
    sLines.setPosition(6 + sLines.width / 2, 72 + sLines.height / 2)
    sScore.setPosition(6 + sScore.width / 2, 22 + sScore.height / 2)
    sHighscore.setPosition(6 + sHighscore.width / 2, 97 + sHighscore.height / 2)
}

// SETTINGS -----------------------------------------------

const CELL_SIZE = 5
const NEXT_PIECES = 3
const MATRIX_HEIGHT = 22
const MATRIX_WIDTH = 10
const X0 = 55
const Y0 = 5

// DATA ---------------------------------------------------

const shapes: Image[] = [
    assets.image`I`,
    assets.image`J`,
    assets.image`L`,
    assets.image`O`,
    assets.image`S`,
    assets.image`T`,
    assets.image`Z`,
    assets.image`I0`,
    assets.image`J0`,
    assets.image`L0`,
    assets.image`O0`,
    assets.image`S0`,
    assets.image`T0`,
    assets.image`Z0`

]

const shapes_hash = [
    {

    }
]

const offsets = [   // [shape: 0..6][rotation --> pop / unshift][direction: top, right, bottom, left]
    [1, 0, 2, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0]
]

const heights = [
    [2, 4, 3, 4],
    [2, 3, 3, 3],
    [2, 3, 3, 3],
    [2, 2, 2, 2],
    [2, 3, 3, 3],
    [2, 3, 3, 3],
    [2, 3, 3, 3]
]

enum Rotation {
    Z = 0,
    R = 1,
    T = 2,
    L = 3
}

// UI -----------------------------------------------------

let bg = image.create(160, 120)
bg.fillRect(X0 - 3, Y0 - 3, 56, 116, 11)          // Matrix
bg.fillRect(X0 - 1, Y0 - 1, 52, 112, 0)
scene.setBackgroundImage(bg)

// STATS --------------------------------------------------

let sScoreTitle = sprites.create(assets.image`txt_score`)
let sLevelTitle = sprites.create(assets.image`txt_level`)
let sLinesTitle = sprites.create(assets.image`txt_lines`)
let sHighscoreTitle = sprites.create(assets.image`txt_hiscore`)
let sNextTitle = sprites.create(assets.image`txt_next`)

sScoreTitle.setPosition(18, 18)
sLevelTitle.setPosition(18, 43)
sLinesTitle.setPosition(18, 68)
sHighscoreTitle.setPosition(23, 93)
sNextTitle.setPosition(134, 18)

let sScore = textsprite.create("0", 0, 11)
sScore.setMaxFontHeight(5)
let sLevel = textsprite.create("0", 0, 11)
sLevel.setMaxFontHeight(5)
let sLines = textsprite.create("0", 0, 11)
sLines.setMaxFontHeight(5)
let sHighscore = textsprite.create("0", 0, 11)
sHighscore.setMaxFontHeight(5)

// GAME ---------------------------------------------------

let level: number = 1
let score: number = 0
let gravity: number = 1
let lines: number = 0
let highscore: number = 0

let bag = new Bag()
let well = new Well()
let tetrimino = new Tetrimino()

let im = image.create(10, 10)

updateStats()

// CONTROLLER ---------------------------------------------

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    tetrimino.rotate(true)
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    tetrimino.rotate(false)
})

controller.down.onEvent(ControllerButtonEvent.Repeated, function () {
    tetrimino.drop(false)
})

controller.left.onEvent(ControllerButtonEvent.Repeated, function () {
    tetrimino.strafe(-1)
})

controller.right.onEvent(ControllerButtonEvent.Repeated, function () {
    tetrimino.strafe(1)
})

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    tetrimino.drop(false)
})

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    tetrimino.strafe(-1)
})

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    tetrimino.strafe(1)
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    tetrimino.drop(true)
})