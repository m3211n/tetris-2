class Bag {
    private preview: Sprite
    private contents: number[]

    constructor() {
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
            this.preview.image.drawImage(shapes_pixel_data[this.contents[i]].img, 0, i * 20 + 5)
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
    shapeID: number
    img: Image
    ghost_img: Image
    colors: number[][]
    offsets: number[]
    rotation: number
    x: number
    y: number
    piece: Sprite
    pitfall: number

    private ghost_piece: Sprite

    constructor(id: number) {
        this.shapeID = id
        this.img = shapes_pixel_data[id].img
        this.ghost_img = shapes_pixel_data[id].ghost_img
        if (this.piece && this.ghost_piece) {
            this.piece.destroy()
            this.ghost_piece.destroy()
        }
        this.piece = sprites.create(image.create(0, 0))
        this.piece.z = 2
        this.ghost_piece = sprites.create(image.create(0, 0))
        this.ghost_piece.z = 1
        this.respawnAt((this.shapeID == 3 ? 4 : 3), 0, Rotation.Z)
    }

    private getColorsArray(): number[][] {
        let result: number[][] = []
        let img = this.piece.image
        let s = img.width / CELL_SIZE
        for (let y = 0; y < s; y++) {
            result.push([])
            for (let x = 0; x < s; x++) {
                let color = img.getPixel(x * CELL_SIZE, y * CELL_SIZE)
                result[y].push(color)
            }
        }
        return result

    }

    private getOffsets(r?: number): number[] {
        let result = []
        if (this.shapeID == 0) {
            result = [1, 0, 2, 0]
        } else if (this.shapeID == 3) {
            result = [0, 0, 0, 0]
        } else {
            result = [0, 0, 1, 0]
        }
        if (r) {
            for (let index = 0; index < r; index++) {
                result.unshift(result.pop())
            }
        }
        return result
    }

    private respawnAt(new_x: number, new_y: number, r: number) {
        // Respawns and updates the rotation of the existing piece at the new location
        this.x = new_x
        this.y = new_y
        this.rotation = r
        console.log(`This is shapeID ${this.shapeID} and rotation ${this.rotation}`)
        let img = this.img
        if (this.rotation != 0) {
            img = img.rotated(this.rotation * 90)
        }
        this.piece.setImage(img)
        this.colors = this.getColorsArray()
        this.offsets = this.getOffsets(this.rotation)
        this.pitfall = this.sonar(well)
        let x = X0 + (this.x * CELL_SIZE + this.piece.width / 2)
        let y = Y0 + (this.y * CELL_SIZE + this.piece.height / 2)
        this.piece.setPosition(x, y)
        print_piece(this.colors)
        this.spawn_ghost()
    }

    private spawn_ghost() {
        let img = this.ghost_img
        if (this.rotation != 0) {
            img = img.rotated(this.rotation * 90)
        }
        this.ghost_piece.setImage(img)
        let x = X0 + (this.x * CELL_SIZE + this.ghost_piece.width / 2)
        let y = Y0 + ((this.y + this.pitfall) * CELL_SIZE + this.ghost_piece.height / 2)
        this.ghost_piece.setPosition(x, y)
    }

    strafe(x_inc: number) {
        let new_x = this.x + x_inc
        if (!this.collision(new_x, this.y, this.rotation)) {
            this.respawnAt(new_x, this.y, this.rotation)
        }
    }

    private sonar(well: Well): number { /* returns min possible drop depth (pitfall) the current piece */
        
        let piece_bottom = this.y - this.colors.length + this.offsets[2]
        let pitfall = MATRIX_HEIGHT - piece_bottom
        // console.log(`----- >> Starting with pitfall = ${pitfall}`)
        for (let col = this.offsets[3]; col < this.colors.length - this.offsets[1]; col++) {
            let piece_column_bottom_hole = 0
            for (let row = this.colors.length - this.offsets[2] - 1; row >= this.offsets[0]; row--) {
                // console.log(`Color at ${row}, ${col} is ${this.tdata.colors[row][col]}`)
                if (this.colors[row][col] != 0) {
                    // console.log(`Found bottom element at [${row}, ${col}]`)
                    const wellColumn = well.cell_col(col + this.x)
/* 
                    let s = ""
                    for (let index = 0; index < wellColumn.length; index++) {
                        s += wellColumn[index]
                    }
 */
                    let peak = wellColumn.indexOf(1)
                    if (peak == -1) {
                        peak = MATRIX_HEIGHT
                    }
                    let col_pitfall = peak - this.y - this.colors.length + this.offsets[2] + piece_column_bottom_hole
                    // console.log(`Column [${col + this.x}] : ${s} Peak = ${peak}; Column pitfall = ${col_pitfall}`)
                    if (col_pitfall < pitfall) {
                        pitfall = col_pitfall
                    }
                    break
                }
                piece_column_bottom_hole ++
            }            
        }
        // console.log(`<< New pitfall = ${pitfall}`)
        return pitfall
    }

    rotate(cw: boolean) {
        let next_rotation
        if (cw) {
            next_rotation = this.rotation + 1
            if (next_rotation > 3) {
                next_rotation = 0
            }
        } else {
            next_rotation = this.rotation - 1
            if (next_rotation < 0) {
                next_rotation = 3
            }
        }
        let tmp_array = this.colors
        this.colors = rotateArray(tmp_array, cw)
        // this.print_piece(tmp_array)
        // this.print_piece(this.tdata.colors)
        let canRotate = true // wall kicks to be added later
        let kick_x = 0
        let kick_y = 0
        // console.log(this.tdata.offsets[0] +" "+ this.tdata.offsets[1] +" "+ this.tdata.offsets[2] +" "+ this.tdata.offsets[3])
        if (canRotate) {
            this.respawnAt(this.x + kick_x, this.y + kick_y, next_rotation)
        }
    }

    drop(hard: boolean) {
        this.respawnAt(this.x, (hard ? this.pitfall : this.y + 1), this.rotation)
        if (this.y == this.y + this.pitfall) {
            lock()
        }
    }

    removeSprites() {
        this.piece.destroy()
        this.ghost_piece.destroy()
    }

    collision(new_x: number, new_y: number, new_rotation: number): boolean {
        if (new_x + this.offsets[3] >= 0 && new_x + this.colors.length - this.offsets[1] <= MATRIX_WIDTH) {

            return false
        } else {
            return true
        }
    }
}

class Well {
    private matrix: Sprite
    colors: number[][]
    cells: number[][]

    constructor() {
        this.colors = []
        this.cells = []
        for (let i = 0; i < MATRIX_HEIGHT; i++) {
            this.colors.push([])
            this.cells.push([])
            for (let j = 0; j < MATRIX_WIDTH; j++) {
                this.colors[i].push(0)
                this.cells[i].push(0)
            }
        }
        this.matrix = sprites.create(image.create(MATRIX_WIDTH * CELL_SIZE, MATRIX_HEIGHT * CELL_SIZE))
        this.matrix.image.fill(0)
        this.matrix.setPosition(X0 + MATRIX_WIDTH * CELL_SIZE / 2, Y0 + MATRIX_HEIGHT * CELL_SIZE / 2)
        this.matrix.z = 0
    }

    changeColor(x: number, y: number, c: number) {
        this.colors[y][x] = c
        this.cells[y][x] = 1
        console.log(`Writing to colors[${y}, ${x}] value ${c})`)
        console.log(`Writing to cells[${y}, ${x}] value ${1})`)

    }

    update() {
        this.matrix.image.fill(0)
        for (let row = 0; row < MATRIX_HEIGHT; row++) {
            for (let col = 0; col < MATRIX_WIDTH; col++) {
                if (this.colors[row][col] != 0) {
                    // console.log("Painting rect at [" + row + ", " + col + "] with color " + this.colors[row][col])
                    this.matrix.image.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE, this.colors[row][col])
                }
            }
        }
    }

    checkRows() {
        let lc = 0
        for (let row = 2; row < MATRIX_HEIGHT; row++) {
            if (this.cells[row].indexOf(0) == -1) {
                let empty_colors: number[] = []
                let empty_cells: number[] = []
                for (let index = 0; index < MATRIX_WIDTH; index++) {
                    empty_colors.push(0)
                    empty_cells.push(0)
                }
                lc ++
                lines ++
                this.cells.removeAt(row)
                this.colors.removeAt(row)
                this.cells.unshift(empty_cells)
                this.colors.unshift(empty_colors)
            }
        }
        this.update()
        if (lc != 0) {
            switch (lc) {
                case 1:
                    score += (100 * level)
                    break
                case 2:
                    score += (300 * level)
                    break
                case 3:
                    score += (500 * level)
                    break
                case 4:
                    score += (800 * level)
            }

            // UPDATE LEVEL
            if (lines >= 10 * level) {
                levelUp()
            }
            updateStats()
        }
    }

    cell_row(i: number): number[] {
        let result = []
        for (let j = 0; j < MATRIX_WIDTH; j++) {
            result.push(this.cells[i][j])
        }
        return result
    }

    cell_col(j: number): number[] {
        let result = []
        for (let i = 0; i < MATRIX_HEIGHT; i++) {
            result.push(this.cells[i][j])
        }
        return result
    }

}

// GAME FUNCTIONS -----------------------------------------

function lock() {
    for (let row = tetrimino.offsets[0]; row < tetrimino.colors.length - tetrimino.offsets[2]; row++) {
        for (let col = tetrimino.offsets[3]; col < tetrimino.colors.length - tetrimino.offsets[1]; col++) {
            if (tetrimino.colors[row][col] != 0) {
                console.log(`Calling changeColor(${tetrimino.x + col}, ${tetrimino.y + row}, ${tetrimino.colors[row][col]})`)
                well.changeColor(tetrimino.x + col, tetrimino.y + row, tetrimino.colors[row][col])
            }
        }
    }
    well.checkRows()
    tetrimino.removeSprites()
    tetrimino = new Tetrimino(bag.deal())

    // print_piece()
    print_well()
}

function levelUp() {

}

// UTILITY FUNCTIONS --------------------------------------

function print_piece(piece: number[][]) {
    let s = "------------\r\n"
    for (let i = 0; i < piece.length; i++) {
        for (let j = 0; j < piece[i].length; j++) {
            if (piece[i][j] != 0) {
                s += "["+piece[i][j]+"]"
            } else {
                s += "   "
            }
        }
        s += "\r\n"
    }
    console.log(s)
}

function print_well() {
    let s = "------------------------------"
    for (let i = 0; i < MATRIX_HEIGHT; i++) {
        for (let j = 0; j < MATRIX_WIDTH; j++) {
            if (well.colors[i][j] == 0) {
                s += "   "
            } else {
                s += "[" + well.colors[i][j] + "]"
            }
        }
        s += "\r\n"
    }
    console.log(s)
}

function rotateArray(arr: number[][], cw: boolean): number[][] {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < i; j++) {
            [arr[i][j], arr[j][i]] = [arr[j][i], arr[i][j]];
        }
    }
    if (cw) {
        for (let i = 0; i < arr.length; i++) {
            arr[i].reverse();
        }
    } else {
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length / 2; j++) {
                [arr[j][i], arr[arr.length - j - 1][i]] = [arr[arr.length - j - 1][i], arr[j][i]];
            }
        }
    }
    return arr
}

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

/* const shapes: Image[] = [
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

] */

const shapes_pixel_data = [
    {
        img: assets.image`I`,
        ghost_img: assets.image`I0`
    },
    {
        img: assets.image`J`,
        ghost_img: assets.image`J0`
    },
    {
        img: assets.image`L`,
        ghost_img: assets.image`L0`
    },
    {
        img: assets.image`O`,
        ghost_img: assets.image`O0`
    },
    {
        img: assets.image`S`,
        ghost_img: assets.image`S0`
    },
    {
        img: assets.image`T`,
        ghost_img: assets.image`T0`
    },
    {
        img: assets.image`Z`,
        ghost_img: assets.image`Z0`
    }
]

/* 
const offsets = [   // [shape: 0..6][rotation --> pop / unshift][direction: top, right, bottom, left]
    [1, 0, 2, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0]
]
 */
/* 
const heights = [
    [2, 4, 3, 4],
    [2, 3, 3, 3],
    [2, 3, 3, 3],
    [2, 2, 2, 2],
    [2, 3, 3, 3],
    [2, 3, 3, 3],
    [2, 3, 3, 3]
]
 */

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
let tetrimino = new Tetrimino(bag.deal())

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