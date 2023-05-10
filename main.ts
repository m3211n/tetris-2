class Bag {
    private preview: Sprite
    private contents: number[]

    constructor() {
        this.contents = []
        this.fill()
        this.preview = sprites.create(image.create(4 * C_SIZE, 15 * C_SIZE))
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
    id: number
    img: Image
    g_img: Image
    colors: number[][]
    offs: number[]
    rot: number
    x: number
    y: number
    s: Sprite
    pit: number

    private g_s: Sprite

    constructor(id: number) {
        this.id = id
        this.img = shapes_pixel_data[id].img
        this.g_img = shapes_pixel_data[id].ghost_img
        if (this.s && this.g_s) {
            this.s.destroy()
            this.g_s.destroy()
        }
        this.s = sprites.create(image.create(0, 0))
        this.s.z = 2
        this.g_s = sprites.create(image.create(0, 0))
        this.g_s.z = 1
        this.respawnAt((this.id == 3 ? 4 : 3), 0, Rotation.Z)
    }

    private getColorsArray(): number[][] {
        let result: number[][] = []
        let img = this.s.image
        let s = img.width / C_SIZE
        for (let y = 0; y < s; y++) {
            result.push([])
            for (let x = 0; x < s; x++) {
                let color = img.getPixel(x * C_SIZE, y * C_SIZE)
                result[y].push(color)
            }
        }
        return result

    }

    private getOffsets(r?: number): number[] {
        let result = []
        if (this.id == 0) {
            result = [1, 0, 2, 0]
        } else if (this.id == 3) {
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
        this.rot = r
        // console.log(`This is shapeID ${this.shapeID} and rotation ${this.rotation}`)
        let img = this.img
        if (this.rot != 0) {
            img = img.rotated(this.rot * 90)
        }
        this.s.setImage(img)
        this.colors = this.getColorsArray()
        this.offs = this.getOffsets(this.rot)
        this.pit = this.sonar(well)
        let x = X0 + (this.x * C_SIZE + this.s.width / 2)
        let y = Y0 + (this.y * C_SIZE + this.s.height / 2)
        this.s.setPosition(x, y)
        // print_piece(this.colors)
        this.spawn_ghost()
    }

    private spawn_ghost() {
        let img = this.g_img
        if (this.rot != 0) {
            img = img.rotated(this.rot * 90)
        }
        this.g_s.setImage(img)
        let x = X0 + (this.x * C_SIZE + this.g_s.width / 2)
        let y = Y0 + ((this.y + this.pit) * C_SIZE + this.g_s.height / 2)
        this.g_s.setPosition(x, y)
    }

    private sonar(well: Well): number { /* returns min possible drop depth (pitfall) the current piece */
        let piece_bottom = this.y + this.colors.length - this.offs[2]
        let pitfall = MATRIX_H - piece_bottom
        // console.log(`----- >> Starting with pitfall = ${pitfall} piece_bottom = ${piece_bottom}`)
        // let s = "" 
        for (let col = this.offs[3]; col < this.colors.length - this.offs[1]; col++) {
            let piece_column_bottom_hole = 0
            for (let row = this.colors.length - this.offs[2] - 1; row >= this.offs[0]; row--) {
                // console.log(`Color at ${row}, ${col} is ${this.colors[row][col]}`)
                if (this.colors[row][col] != 0) {
                    const col_bottom = piece_bottom - piece_column_bottom_hole
                    // console.log(`Found bottom element at [${row}, ${col}]`)
                    const wellColumn = well.cell_col(col + this.x).slice(col_bottom)
                    for (let index = 0; index < wellColumn.length; index++) {
                        // s += wellColumn[index]
                    }
                    let index = wellColumn.indexOf(1)
                    if (index == -1) {
                        index = wellColumn.length
                    }
                    let col_pitfall = index
                    // s += "\n"
                    if (index < pitfall) {
                        pitfall = index
                    }
                    break
                }
                piece_column_bottom_hole ++
            }            
        }
        // console.log(`${s}`)
        console.log(`<< Piece pitfall = ${pitfall}`)
        return pitfall
    }
    
    strafe(x_inc: number) {
        const new_x = this.x + x_inc
        const collision = (new_x + this.offs[3] < 0 || new_x + this.colors.length - this.offs[1] > MATRIX_W)
        if (!collision && !this.cellCollision(new_x, this.y)) {
            this.respawnAt(new_x, this.y, this.rot)
        }
    }

    rotate(cw: boolean) {
        let next_rotation
        if (cw) {
            next_rotation = this.rot + 1
            if (next_rotation > 3) {
                next_rotation = 0
            }
        } else {
            next_rotation = this.rot - 1
            if (next_rotation < 0) {
                next_rotation = 3
            }
        }
        let tmp_array = this.colors
        let canRotate = true // wall kicks to be added later
        let kick_x = 0
        let kick_y = 0
        if (canRotate) {
            this.colors = rotate(tmp_array, cw)
            this.respawnAt(this.x + kick_x, this.y + kick_y, next_rotation)
        }
    }

    drop(hard: boolean) {
        if (hard) {
            this.respawnAt(this.x, this.y + this.pit, this.rot)
            lock()
        } else {
            console.log("Soft drop")
            const new_y = this.y + 1
            const collision = (this.pit == 0)
            if (!collision && !this.cellCollision(this.x, new_y)) {
                this.respawnAt(this.x, this.y + 1, this.rot)
            } else {
                lock()
            }
        }
    }

    removeSprites() {
        this.s.destroy()
        this.g_s.destroy()
    }

    cellCollision(new_x: number, new_y: number): boolean {
        const arr = this.colors
        console.log("Checking cell collisions...")
        for (let t_row = 0; t_row < arr.length; t_row++) {
            for (let t_col = 0; t_col < arr.length; t_col++) {
                if (arr[t_row][t_col] != 0 && well.cells[t_row + new_y][t_col + new_x] == 1) {
                    console.log("Collision!!!")
                    return true
                }
            }
        }
        return false
    }
}

class Well {
    private s: Sprite
    colors: number[][]
    cells: number[][]

    constructor() {
        this.colors = []
        this.cells = []
        for (let i = 0; i < MATRIX_H; i++) {
            this.colors.push([])
            this.cells.push([])
            for (let j = 0; j < MATRIX_W; j++) {
                this.colors[i].push(0)
                this.cells[i].push(0)
            }
        }
        this.s = sprites.create(image.create(MATRIX_W * C_SIZE, MATRIX_H * C_SIZE))
        this.s.image.fill(0)
        this.s.setPosition(X0 + MATRIX_W * C_SIZE / 2, Y0 + MATRIX_H * C_SIZE / 2)
        this.s.z = 0
    }

    changeColor(x: number, y: number, c: number) {
        this.colors[y][x] = c
        this.cells[y][x] = 1
        // console.log(`Writing to colors[${y}, ${x}] value ${c})`)
        // console.log(`Writing to cells[${y}, ${x}] value ${1})`)

    }

    update() {
        this.s.image.fill(0)
        for (let row = 0; row < MATRIX_H; row++) {
            for (let col = 0; col < MATRIX_W; col++) {
                if (this.colors[row][col] != 0) {
                    // console.log("Painting rect at [" + row + ", " + col + "] with color " + this.colors[row][col])
                    this.s.image.fillRect(col * C_SIZE, row * C_SIZE, C_SIZE, C_SIZE, this.colors[row][col])
                }
            }
        }
    }

    checkRows() {
        let lc = 0
        for (let row = 2; row < MATRIX_H; row++) {
            if (this.cells[row].indexOf(0) == -1) {
                let empty_colors: number[] = []
                let empty_cells: number[] = []
                for (let index = 0; index < MATRIX_W; index++) {
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
        for (let j = 0; j < MATRIX_W; j++) {
            result.push(this.cells[i][j])
        }
        return result
    }

    cell_col(j: number): number[] {
        let result = []
        for (let i = 0; i < MATRIX_H; i++) {
            result.push(this.cells[i][j])
        }
        return result
    }

}

// GAME FUNCTIONS -----------------------------------------

function lock() {
    for (let row = t.offs[0]; row < t.colors.length - t.offs[2]; row++) {
        for (let col = t.offs[3]; col < t.colors.length - t.offs[1]; col++) {
            if (t.colors[row][col] != 0) {
                // console.log(`Calling changeColor(${tetrimino.x + col}, ${tetrimino.y + row}, ${tetrimino.colors[row][col]})`)
                well.changeColor(t.x + col, t.y + row, t.colors[row][col])
            }
        }
    }
    well.checkRows()
    t.removeSprites()
    t = new Tetrimino(bag.deal())

    // print_piece()
    // print_well()
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
    for (let i = 0; i < MATRIX_H; i++) {
        for (let j = 0; j < MATRIX_W; j++) {
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

function rotate(arr: number[][], cw: boolean): number[][] {
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

const C_SIZE = 5
const NEXT_PIECES = 3
const MATRIX_H = 22
const MATRIX_W = 10
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

const wall_kick_data = [
    [[-1, 0], [-1, 1], [0, -2], [-1, -2]],  // 0 -> R
    [[1, 0], [1, 1], [0, -2], [1, -2]],     // 0 -> L

    [[1, 0], [1, -1], [0, 2], [1, 2]],      // R -> 2
    [[1, 0], [1, -1], [0, 2], [1, 2]],      // R -> 0

    [[1, 0], [1, 1], [0, -2], [1, -2]],     // 2 -> L
    [[-1, 0], [-1, 1], [0, -2], [-1, -2]],  // 2 -> R

    [[-1, 0], [-1, -1], [0, 2], [-1, 2]],   // L -> 0
    [[-1, 0], [-1, -1], [0, 2], [-1, 2]]    // L -> 2
]

const wall_kick_data_I = [
    [[-2, 0], [1, 0], [-2, -1], [1, 2]],    // 0 -> R
    [[-1, 0], [+2, 0], [-1, 2], [2, -1]],   // 0 -> L

    [[-1, 0], [2, 0], [-1, 2], [2, -1]],    // R -> 2
    [[2, 0], [-1, 0], [+2, +1], [-1, -2]],  // R -> 0

    [[2, 0], [-1, 0], [2, 1], [-1, -2]],    // 2 -> L
    [[1, 0], [-2, 0], [1, -2], [-2, -2]],   // 2 -> R

    [[1, 0], [-2, -0], [1, -2], [-2, 1]],   // L -> 0
    [[-2, 0], [1, 0], [-2, -1], [1, 2]]     // L -> 2
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
bg.fillRect(X0, Y0 + 10, 50, 1, 12)
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
let t = new Tetrimino(bag.deal())

updateStats()

// CONTROLLER ---------------------------------------------

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    t.rotate(true)
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    t.rotate(false)
})

controller.down.onEvent(ControllerButtonEvent.Repeated, function () {
    t.drop(false)
})

controller.left.onEvent(ControllerButtonEvent.Repeated, function () {
    t.strafe(-1)
})

controller.right.onEvent(ControllerButtonEvent.Repeated, function () {
    t.strafe(1)
})

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    t.drop(false)
})

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    t.strafe(-1)
})

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    t.strafe(1)
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    t.drop(true)
})