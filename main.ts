class Bag {
    private preview: Sprite
    private hold_preview: Sprite
    private contents: number[]
    private _can_hold: boolean
    private _hold_cell: number

    set can_hold(value: boolean) {
        this._can_hold = value
    }

    get can_hold() {
        return this._can_hold
    }

    set hold_cell(value: number) {
        this.hold_preview.image.fill(0)
        this._can_hold = false
        this._hold_cell = value
        this.hold_preview.image.drawImage(shapes_pixel_data[this._hold_cell], 0, 0)
    }

    get hold_cell() {
        // console.log(`Dealing from hold id = ${this._hold_cell}`)
        return this._hold_cell
    }
    get next() {
        let next = this.contents.shift()
        if (this.contents.length < NEXT_PIECES) {
            this.fill()
        }
        // console.log(`Hold id = ${this._hold_cell}`)
        this.preview.image.fill(0)
        for (let i = 0; i < 3; i++) {
            this.preview.image.drawImage(shapes_pixel_data[this.contents[i]], 0, i * 20 + 5)
        }
        this._can_hold = true
        return next  
    }
 
    constructor() {
        this.contents = []
        this.fill()
        this.preview = sprites.create(image.create(4 * C_SIZE, 10 * C_SIZE))
        this.hold_preview = sprites.create(image.create(4 * C_SIZE, 2 * C_SIZE))
        this.preview.setPosition(134, 51)
        this.hold_preview.setPosition(134, 103)
        this._can_hold = true
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
}

class Tetrimino {
    id: number
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
        console.log(`Delt ID = ${this.id}`)
        this.s = sprites.create(image.create(0, 0))
        this.s.z = 2
        this.g_s = sprites.create(image.create(0, 0))
        this.g_s.z = 1
        this.respawnAt((this.id == 3 ? 4 : 3), 0, 0)
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
        if (r != this.rot) {
            this.rot = r
            this.colors = getPieceColors(this.id, this.rot)
            let imgs: Image[] = getPieceImage(this.colors)
            this.s.setImage(imgs[0])
            this.g_s.setImage(imgs[1])
            this.offs = this.getOffsets(this.rot)
        }
        this.pit = this.sonar(well)
        let x = X0 + (this.x * C_SIZE + this.s.width / 2)
        let y = Y0 + (this.y * C_SIZE + this.s.height / 2)
        this.s.setPosition(x, y)
        let g_x = X0 + (this.x * C_SIZE + this.g_s.width / 2)
        let g_y = Y0 + ((this.y + this.pit) * C_SIZE + this.g_s.height / 2)
        this.g_s.setPosition(g_x, g_y)
    }
    
    private sonar(well: Well): number { 

        /* 
        returns max possible drop depth (pitfall) the current piece
        considering the holes in the bottom of the piece
        */

        const piece_btm = this.y + this.colors.length - this.offs[2]
        let pitfall = MATRIX_H - piece_btm
        // console.log(`----- >> Starting with pitfall = ${pitfall} piece_bottom = ${piece_bottom}`)
        // let s = "" 
        for (let col = this.offs[3]; col < this.colors.length - this.offs[1]; col++) {
            let piece_hole_depth = 0
            for (let row = this.colors.length - this.offs[2] - 1; row >= this.offs[0]; row--) {
                // console.log(`Color at ${row}, ${col} is ${this.colors[row][col]}`)
                if (this.colors[row][col] != 0) {
                    const col_btm = piece_btm - piece_hole_depth
                    // console.log(`Found bottom element at [${row}, ${col}]`)
                    const wellColumn = well.cell_col(col + this.x).slice(col_btm)
/* 
                    for (let index = 0; index < wellColumn.length; index++) {
                        s += wellColumn[index]
                    }
 */
                    let index = wellColumn.indexOf(1)
                    if (index == -1) {
                        index = wellColumn.length
                    }
                    // s += "\n"
                    if (index < pitfall) {
                        pitfall = index
                    }
                    break
                }
                piece_hole_depth ++
            }            
        }
        // console.log(`${s}`)
        // console.log(`<< Piece pitfall = ${pitfall}`)
        return pitfall
    }

    private collisionForecast(new_x: number, new_y: number, new_rot: number): boolean {

        let arr: number[][]
        let offs: number[]

        // console.log("Checking collisions")

        // If new_rot is different from the current rotation, we need to create
        // a copy of the current piece matrix, rotate it and generate offsets array for it
        // If rotation is not about to occur, we just take the current piece matrix and
        // offsets
        
        if (new_rot != this.rot) { /* if this is a forecast for rotation */
            arr = getPieceColors(this.id, new_rot)
            offs = this.getOffsets(new_rot)
        } else {
            arr = this.colors
            offs = this.offs
        }
        for (let t_row = offs[0]; t_row < arr.length - offs[2]; t_row++) {
            for (let t_col = offs[3]; t_col < arr.length - offs[1]; t_col++) {
                if (arr[t_row][t_col] != 0 && (t_col + new_x < 0 || t_col + new_x > MATRIX_W - 1 || t_row + new_y > MATRIX_H - 1)) {
                    console.log(`Out of bounds ${arr[t_row][t_col]} && ${t_col + new_x} || ${t_col + new_x} || ${t_row + new_y}`)
                    return true
                } else if (arr[t_row][t_col] != 0 && well.cells[t_row + new_y][t_col + new_x] == 1) {
                    console.log("Cell collision")
                    return true
                }
            }
        }

    return false
    }

    strafe(x_inc: number) {
        const new_x = this.x + x_inc
        // const collision = (new_x + this.offs[3] < 0 || new_x + this.colors.length - this.offs[1] > MATRIX_W)
        if (!this.collisionForecast(new_x, this.y, this.rot)) {
            this.respawnAt(new_x, this.y, this.rot)
        }
    }

    rotate() {
        let next_rotation = this.rot - 1 // in this game we only rotate CCW
        if (next_rotation < 0) {
            next_rotation = 3
        }
        const wall_kick_tests = (this.id == 0 ? wall_kick_data_I[this.rot * 2 + 1] : wall_kick_data[this.rot * 2 + 1])
        let kick_x = 0
        let kick_y = 0
        for (let test = 0; test < 5; test++) {
            if (!this.collisionForecast(this.x + wall_kick_tests[test][0], this.y - wall_kick_tests[test][1], next_rotation)) {
                kick_x = wall_kick_tests[test][0]
                kick_y = -wall_kick_tests[test][1]
                this.respawnAt(this.x + kick_x, this.y + kick_y, next_rotation)
                break
            }
        }
    }

    drop(hard: boolean) {
        if (hard) {
            score += this.pit * 2
            updateStats()
            this.respawnAt(this.x, this.y + this.pit, this.rot)
            lock()
        } else {
            const new_y = this.y + 1
            if (!this.collisionForecast(this.x, new_y, this.rot)) {
                this.respawnAt(this.x, new_y, this.rot)
            } else {
                lock()
            }
        }
    }

    removeSprites() {
        this.s.destroy()
        this.g_s.destroy()
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
        this.s.image.fill(0)
        for (let row = 0; row < MATRIX_H; row++) {
            for (let col = 0; col < MATRIX_W; col++) {
                if (this.colors[row][col] != 0) {
                    // console.log("Painting rect at [" + row + ", " + col + "] with color " + this.colors[row][col])
                    this.s.image.fillRect(col * C_SIZE, row * C_SIZE, C_SIZE, C_SIZE, this.colors[row][col])
                }
            }
        }
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
                level++
                gravity = Math.pow(0.8 - ((level - 1) * 0.007), level - 1)
            }
            updateStats()
        }
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

function hold() {
    if (bag.can_hold) {
        let held_id = t.id
        t.removeSprites()
        if (bag.hold_cell !== undefined) {
            t = new Tetrimino(bag.hold_cell)
        } else {
            t = new Tetrimino(bag.next)
        }
        bag.hold_cell = held_id
        bag.can_hold = false
    }
}

function lock() {
    for (let row = t.offs[0]; row < t.colors.length - t.offs[2]; row++) {
        for (let col = t.offs[3]; col < t.colors.length - t.offs[1]; col++) {
            if (t.colors[row][col] != 0) {
                // console.log(`Calling changeColor(${tetrimino.x + col}, ${tetrimino.y + row}, ${tetrimino.colors[row][col]})`)
                well.changeColor(t.x + col, t.y + row, t.colors[row][col])
            }
        }
    }
    if (t.y == 0) {
        // clearInterval(tickID)
        game.over(false)
    }
    well.checkRows()
    t.removeSprites()
    t = new Tetrimino(bag.next)
}

// UTILITY FUNCTIONS --------------------------------------

function getPieceColors(id: number, rot: number): number[][] {
    let matrix: number[][] = []
    const shapes = [
        [[4, 5, 6, 7], [2, 6, 10, 14], [8, 9, 10, 11], [1, 5, 9, 13]],
        [[0, 3, 4, 5], [1, 2, 4, 7], [3, 4, 5, 8], [1, 4, 6, 7]],
        [[2, 3, 4, 5], [1, 4, 7, 8], [3, 4, 5, 6], [0, 1, 4, 7]],
        [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]],
        [[1, 2, 3, 4], [1, 4, 5, 8], [4, 5, 6, 7], [0, 3, 4, 7]],
        [[1, 3, 4, 5], [1, 4, 5 ,7], [3, 4, 5, 7], [1, 3, 4, 7]],
        [[0, 1, 4, 5], [2, 4, 5, 7], [3, 4, 7 ,8], [1, 3 ,4 ,6]]
    ]
    let max = (id == 0) ? 4 : ((id == 3) ? 2 : 3)
    let i = 0
    for (let r = 0; r < max; r++) {
        matrix.push([])
        for (let c = 0; c < max; c++) {
            if (shapes[id][rot][i] % max == c && Math.floor(shapes[id][rot][i] / max) == r) {
                matrix[r].push(tetris_colors[id])
                i++
            } else {
                matrix[r].push(0)
            }
        }
    }
    return matrix 
}

function getPieceImage(colors: number[][]): [Image, Image] {
    let img = image.create(colors.length * C_SIZE, colors.length * C_SIZE)
    let ghost_img = image.create(colors.length * C_SIZE, colors.length * C_SIZE)
    for (let y = 0; y < colors.length; y++) {
        for (let x = 0; x < colors.length; x++) {
            if (colors[y][x] != 0) {
                img.fillRect(x * C_SIZE, y * C_SIZE, C_SIZE, C_SIZE, colors[y][x])
                img.fillRect(x * C_SIZE + 1, y * C_SIZE + 1, C_SIZE - 2, C_SIZE - 2, 0)
                img.fillRect(x * C_SIZE + 2, y * C_SIZE + 2, C_SIZE - 4, C_SIZE - 4, colors[y][x])
                ghost_img.fillRect(x * C_SIZE, y * C_SIZE, C_SIZE, C_SIZE, 12)
                ghost_img.fillRect(x * C_SIZE + 1, y * C_SIZE + 1, C_SIZE - 2, C_SIZE - 2, 0)
            }
        }
    }
    return [img, ghost_img]
}

function printPiece(piece: number[][]) {
    let s = "------------\r\n"
    for (let i = 0; i < piece.length; i++) {
        for (let j = 0; j < piece[i].length; j++) {
            if (piece[i][j] != 0) {
                s += `[${piece[i][j]}]`
            } else {
                s += "   "
            }
        }
        s += "\r\n"
    }
    console.log(s)
}

function printWell() {
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

function printArray(arr: number[]) {
    let s = "[ "
    for (let elem of arr) {
        s += elem + " "
    }
    s += "]"
    console.log(s)
}

function print2DArray(arr: number[][]) {
    let s = ""
    for (let row of arr) {
        for (let elem of row) {
            s += elem + " "
        }
        s += "\n"
    }
    console.log(s)
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

const C_SIZE = 6
const NEXT_PIECES = 3
const MATRIX_H = 20
const MATRIX_W = 10
const X0 = 50
const Y0 = 0

// DATA ---------------------------------------------------

const tetris_colors = [9, 8, 4, 5, 7, 10, 2]

const shapes_pixel_data = [
    assets.image`I`,
    assets.image`J`,
    assets.image`L`,
    assets.image`O`,
    assets.image`S`,
    assets.image`T`,
    assets.image`Z`
]

const shapes = [
    [[4, 5, 6, 7], [2, 6, 10, 14], [8, 9, 10, 11], [1, 5, 9, 13]],
    [[0, 3, 4, 5], [1, 2, 4, 7], [3, 4, 5, 8], [1, 4, 6, 7]],
    [[2, 3, 4, 5], [1, 4, 7, 8], [3, 4, 5, 6], [0, 1, 4, 7]],
    [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]],
    [[1, 2, 3, 4], [1, 4, 5, 8], [4, 5, 6, 7], [3, 4, 5, 7]],
    [[1, 3, 4, 5], [1, 4, 5 ,7], [3, 4, 5, 7], [1, 3, 4, 7]],
    [[0, 1, 4, 5], [2, 4, 5, 7], [3, 4, 7 ,8], [1, 3 ,4 ,6]]
]

const wall_kick_data = [
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],  // 0: 0 cw
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],     // 1: 0 !cw

    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],      // 2: 1 cw
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],      // 3: 1 !cw

    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],     // 4: 2 cw
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],  // 5: 2 !cw

    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],   // 6: 3 cw
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]    // 7: 3 !cw
]

const wall_kick_data_I = [
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],    // 0: 0 cw
    [[0, 0], [-1, 0], [+2, 0], [-1, 2], [2, -1]],   // 1: 0 !cw

    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],    // 2: 1 cw
    [[0, 0], [2, 0], [-1, 0], [+2, +1], [-1, -2]],  // 3: 1 !cw

    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],    // 4: 2 cw
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, -2]],   // 5: 2 !cw

    [[0, 0], [1, 0], [-2, -0], [1, -2], [-2, 1]],   // 6: 3 cw
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]     // 7: 3 !cw
]

// UI -----------------------------------------------------

let bg = image.create(160, 120)
bg.fillRect(X0-4, Y0, 68, 120, 12)          // Matrix
bg.fillRect(X0-1, Y0, 62, 120, 0)          // Matrix
scene.setBackgroundImage(bg)

let pause_img = sprites.create(assets.image`pause`)
pause_img.z = 10
pause_img.setPosition(80, -60)

// STATS --------------------------------------------------

let sScoreTitle = sprites.create(assets.image`txt_score`)
let sLevelTitle = sprites.create(assets.image`txt_level`)
let sLinesTitle = sprites.create(assets.image`txt_lines`)
let sHighscoreTitle = sprites.create(assets.image`txt_hiscore`)
let sNextTitle = sprites.create(assets.image`txt_next`)
let sHoldTitle = sprites.create(assets.image`txt_hold`)

sScoreTitle.setPosition(18, 18)
sLevelTitle.setPosition(18, 43)
sLinesTitle.setPosition(18, 68)
sHighscoreTitle.setPosition(23, 93)
sNextTitle.setPosition(134, 18)
sHoldTitle.setPosition(134, 93)

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
let paused = false
let frame: number = 0

let bag = new Bag()
let well = new Well()
let t = new Tetrimino(bag.next)

game.onUpdate(function () {
    const tick = gravity * 60
    frame++
    if (frame > tick) {
        t.drop(false)
        frame = 0
    }

})

updateStats()

// CONTROLLER ---------------------------------------------

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    t.rotate()
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    hold()
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