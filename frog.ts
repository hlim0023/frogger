import "./style.css";

import { fromEvent, interval } from 'rxjs';
import { map, filter, switchMap, merge, scan } from 'rxjs/operators';


type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'r'
type Event = 'keydown' | 'keyup'



function frogGame() {

  /**
   * This is the view for your game to add and update your game elements.
   */
  type ViewType = 'car' | 'frog' | 'plank' | 'dest' | 'boat' | 'bug'


  // our game has the following view element types:
  class Tick { constructor(public readonly elapsed: number) { } }
  class Move { constructor(public readonly x: number) { } }
  class Jump { constructor(public readonly y: number) { } }
  class Reset { constructor(public readonly on: boolean) { } }
  class Pause { constructor(public readonly on: boolean) { } }

  /**
   *  The Keyboard obsevable for the gam
   */
  const
    // The Oberservable keyboard actions from events 
    keyObservable = <T>(e: Event, k: Key, result: () => T) =>
      fromEvent<KeyboardEvent>(document, e)
        .pipe(
          filter(({ key }) => key === k),
          filter(({ repeat }) => !repeat),
          map(result)),
    // The key action for move left and right changing the x axis 
    startLeftMove = keyObservable('keydown', 'ArrowLeft', () => new Move(-60)),
    startRightMove = keyObservable('keydown', 'ArrowRight', () => new Move(60)),
    stopLeftMove = keyObservable('keyup', 'ArrowLeft', () => new Move(0)),
    stopRightMove = keyObservable('keyup', 'ArrowRight', () => new Move(0)),

    // The key action for Jumping up or down changing the Y axis
    startUp = keyObservable('keydown', 'ArrowUp', () => new Jump(-60)),
    startDown = keyObservable('keydown', 'ArrowDown', () => new Jump(30)),
    stopUp = keyObservable('keyup', 'ArrowUp', () => new Jump(0)),
    stopDown = keyObservable('keyup', 'ArrowDown', () => new Jump(0)),
    reset = keyObservable('keydown', 'r', () => new Reset(true))


  //Some Constants values wil be used for the game, which juts numbers and lists 
  const
    Constants = {
      CanvasSize: 600,
      plankNum: [2, 4],
      boatNum: [1, 3],
      bugNum: [3],
      destNum: [0, 1, 2, 3],
      CarNum: [6, 7, 8]
    } as const


  //The interface called Body for the objects of the game 
  // Cars, frog etc.
  interface Body {
    id: string
    viewType: ViewType,
    x: number,
    y: number,
    width: number
    height: number
    colour: string
    index: number
  }



  /**
   * Create Rect for the game objects, the images just Rect 
   * This functioon is a curried function for SFP Style
   * To create all rect with different name and varables 
   */
  const createRect = (viewType: ViewType, colour: string, width: number, height: number) =>
    (rotateX: number, rotateY: number) =>
      (x: number, y: number, i: number) =>
        <Body>{
          id: `${viewType}${i}`,
          viewType: viewType,
          x: x + rotateX * i,
          y: y + rotateY * i,
          width: width,
          height: height,
          colour: colour,
          index: i
        },
    //The image of this game are all rectengars, functions below just to creat the objects 
    createFrog = createRect("frog", "red", 60, 60)(0, 0)(170, 540, 0),
    createCar = createRect("car", "blue", 120, 60)(60, 60),//The Car objects on the ground 
    createplank = createRect("plank", "yellow", 100, 60)(120, 60),//The rever 
    createboat = createRect("plank", "green", 120, 60)(120, 60),//The rever 
    createdest = createRect("dest", "pink", 60, 60)(180, 0),//The destination of the game
    createbug = createRect("bug", "pink", 30, 30)(120, 60)//The destination of the game

  //type of the state of the game 
  //the readonly type for the game 
  //REASON: to do SFR Style 
  type State = Readonly<{
    score: number,
    level: number,
    life: number,
    car: ReadonlyArray<Body>
    boats: ReadonlyArray<Body>
    bugs: ReadonlyArray<Body>
    planks: ReadonlyArray<Body>
    croco: ReadonlyArray<Body>
    desti: ReadonlyArray<Body>
    frog: Body
    gameOver: boolean
    reset: boolean
  }>

  // The functions used to initilise the game state.
  //to make some cars on the ground section 
  //Reason; we apply them into the initail states 
  const startCars = Constants.CarNum
    .map((_) => createCar(0, 0, _)),

    // Make some planks on the rever section
    startplank = Constants.plankNum
      .map((_) => createplank(0, 0, _)),

    // Make some boat on the rever section
    startboat = Constants.boatNum
      .map((_) => createboat(0, 0, _)),

    //destination the place frog to go in 
    startbug = Constants.bugNum
      .map(_ => createbug(0, 0, _)),

    //destination the place frog to go in 
    startdest = Constants.destNum
      .map(_ => createdest(0, 0, _)),

    //the crocodile
    crocodile = Constants.plankNum
      .map(_ => createCar(0, 0, _))



  // The initial State for the game, which stores the information for the game 
  // this state is all varavles we need for the game
  //and they are read only 
  const initialState: State = {
    score: 0,
    level: 0,
    life: 5,
    car: startCars,
    planks: startplank,
    boats: startboat,
    croco: crocodile,
    bugs: startbug,
    desti: startdest,
    frog: createFrog,
    gameOver: false,
    reset: false
  }


  /**
   * The movement of the non-player object 
   * move to the right direction using speed
   * just using + or - to control left or right 
   */
  //move to the right 
  const moveObjright = (o: Body) => (speed: number) => <Body>{
    ...o,
    x: torusWrap(o.x + speed)//using warp to cross over 
  },
    //move the left function 
    moveObjleft = (o: Body) => (speed: number) =>
      <Body>{
        ...o,
        x: torusWrap(o.x - speed)
      },


    // The wrap function is used to wrap the whole svg image over
    torusWrap = (x: number) => {
      const s = Constants.CanvasSize,
        wrap = (v: number) => v < 0 ? v + s : v > s ? v - s : v;
      return (wrap(x))
    },

    //
    /**
     * tick function return a state, will be apply form the interval
     * This fuction is a tick that for every 10 interval 
     * This function will turn thr collison function, we can consider it called it
     * The auto move of the cars, planks, the movement will be applied here for every tick 
     * @param s: the State of the game 
     * @param elapsed: just the elapsed from the classes 
     *
     */
    tick = (s: State, elapsed: number) => {
      ///make sure it is not game over, if it is game over it will not doinng move and collison 
      //to make it sense  
      if (!s.gameOver) {
        return <State>
          handleCollisions(
            {
              ...s,
              // move cars in different direction and different speed, so use filtter and concat for the car list 
              car: s.car.filter(_ => _.index < 7).map(_ => moveObjright(_)(2 + s.level))
                // using the index to move right in 2 
                .concat(s.car.filter(_ => _.index == 7).map(_ => moveObjright(_)(0.5 + s.level)))
                //move right slower in 0.5
                .concat(s.car.filter(_ => _.index > 7).map(_ => moveObjleft(_)(1 + s.level))),
              //move left in 1 speed 

              planks: s.planks.map(_ => moveObjleft(_)(1 + s.level)),//all plank just move same direction 
              croco: s.croco.map(c => moveObjleft(c)(1 + s.level)),//crocadile just in the same row with planks 

              boats: s.boats.map(_ => moveObjright(_)(1 + s.level))
              //move boats 
            }
          )
      }
      return <State>{ ...s }
      // just return the inital state 
    }


  /**
   * The purpose of this function is to Handling Collisions for obejcts 
   * 1. forg with planks 
   * 2. forg with cars
   * 3. forg with boats 
   * 4. forg with crocodiles 
   * 5. frog with bugs 
   * 6. frog with destinations 
   * this will return the updated state back to the tick 
   * Reason: to make all collisons check here, this game is mainly doing coliison with all objects
   * 
   * THE GAMEOVER CHECKS here
   * if gameover, either the frog run in to the car or step into the revier 
   * but frog has 5 lives, so that lives need to be 0 to game over
   * just combine two condtioons above 
   * 
   * @param s the state that tick pass in 
   * @returns return the states and bakc to the tick 
   */
  const handleCollisions = (s: State) => {
    const
      // Two objects to check overlap
      // The rect collision 2D for the game passing to body to check collison 
      // return true or false for this function 
      bodiesCollided = ([a, b]: [Body, Body]) =>
      // check the widths 
      (a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        //check the heights 
        a.y < b.y + b.height &&
        a.y + a.height > b.y),

      // using fillter to check frog with cars collisons 
      carcoll = s.car.filter(r => bodiesCollided([s.frog, r])).length > 0,

      //  THE REVIER Objects (planks and boats), they require the frog to step on it 
      // So they collison have to occur, used length ==0 here 
      // the <=240 just the region that in rever 
      // The collison for frog and planks
      plankcoll = s.frog.y <= 240 && s.planks.filter(r => bodiesCollided([s.frog, r])).length == 0,
      // The collison for frog and boats 
      boatcoll = s.frog.y <= 240 && s.boats.filter(r => bodiesCollided([s.frog, r])).length == 0,

      //The bug collison to add scores 
      //The bug just simply collie to increse score 
      bugcoll = s.bugs.filter(r => bodiesCollided([s.frog, r])).length > 0,

      //collisons with the destination, to coulour with red means it has been acheived
      destcoll = s.desti.filter(r => bodiesCollided([s.frog, r]) && r.colour != "red").length > 0



    // The if check for thr planks
    //Becasue when we in the planks we need to make frog move in the same peak with the plank to step on it 
    if (s.planks.filter(r => bodiesCollided([s.frog, r])).length > 0) {
      //make the frog stick on the plank
      const ride = s.planks.filter(r => bodiesCollided([s.frog, r])).reduce(_ => _);
      // using reduce to make the frog stick on the same place with the plank 
      return <State>{
        ...s,
        frog: moveObjleft(ride)(1 + s.level),// move the frog with the same peak 
        gameOver: (carcoll || (plankcoll && boatcoll)) && s.life <= 0// the game over check 
      }
    }

    // the boat if condition is similar to the plank above, just different direction 
    //and in the boat rows there is a BUG Object here for addition 
    if (s.boats.filter(r => bodiesCollided([s.frog, r])).length > 0) {
      //make the frog stick on the boat
      const ride = s.boats.filter(r => bodiesCollided([s.frog, r])).reduce(_ => _);
      // using reduce to make the frog stick on the same place 

      // the bug when on board of the boat  
      if (bugcoll) {
        return <State>{
          ...s,
          score: s.score + 500,
          bug: s.bugs.filter(_ => _).map(_ => _.y = 7000),
          // after collison move to a place to make it dispear
          // so just move it to somewhere that we never going to touch 
          // to make it easy 
          frog: moveObjright(ride)(1),

          gameOver: (carcoll || (plankcoll && boatcoll)) && s.life <= 1
          // the car and revier check && make sure life is still their  
        }
      }
      // if no bug just return the move only 
      return <State>{
        ...s,
        frog: moveObjright(ride)(1),
        gameOver: (carcoll || (plankcoll && boatcoll)) && s.life <= 1
        // the game over is still same 
      }
    }


    // To check the colour of the desitination and move the frog back to the initial start point 
    if (destcoll) {
      s.desti.filter(r => bodiesCollided([s.frog, r])).map(des => des.colour = "red")
      // change the coulor of the destination into red means reached 
      return roundsState(s);
    }
    //handle the destination collison's coulour reset 
    if (s.reset) {
      // if the rest is on, we just change the colour back to pinl
      s.desti.filter(_ => _).map(des => des.colour = "pink")
      return {// return the reset states 
        ...s, reset: false, level: 0, life: 5, gameOver: (carcoll || (plankcoll && boatcoll))
      }
    }

    // see the frog run into car or revier to reduce the life 
    if (carcoll || (plankcoll && boatcoll)) {
      //reduce the life
      return <State>{
        ...s,
        life: s.life - 1,
        // reduce life by 1
        // also move the frog back to its place
        frog: {
          ...s.frog,
          x: 200,
          y: 540
        },
        // gameover is stilll same condition as mentioned 
        gameOver: (carcoll || (plankcoll && boatcoll)) && s.life <= 1
      }

    }

    // Return the state back to interval, gameover to update the view 
    //no collisons 
    return <State>{
      ...s,
      gameOver: (carcoll || (plankcoll && boatcoll)) && s.life <= 1
    }

  }

  /**
   * This functioon is used to back to start point when the frog reach the destination.
   * Also, increse the difficulty of the game 
   * @param s the state
   * @returns the winning round state
   */
  const
    roundsState = (s: State) =>
      <State>{
        ...s,
        level: s.level + 1, //level up increase the difficulty
        score: s.score + 1000,// boost score when frog reaches the destination 
        //move frog  back to initail place (start point )
        frog: {
          ...s.frog,
          x: 200,
          y: 540
        }
      }



  /**
   * The reduce State to modfy the sate and the actions is taken place here
   * frog move, jump etc. 
   * Which will the keyboard event using e to check each of the class
   * The Move and jump : it will update the axis values of the frog 
   * The reset just reset the score and frog's place to initial place 
   * REASON: do this for the interval overble, it just take the reduce with intial states 
   * check the instance 
   * The tick fucntion will be return if all these calsses not been detetected 
   * @param s the state
   * @param e the classes for the game 
   * @returns return the state 
   */
  const
    reduceState = (s: State, e: Move | Tick | Jump | Reset) =>
      ///The Move class for frog to move left and right 
      e instanceof Move ? {
        ...s,
        frog: { ...s.frog, x: s.frog.x + e.x },// update the x value by e.x
        score: s.score + 1,// increse the score by 1 for sucussful move 
      } :
        // THE Jump class for frog to jump 
        e instanceof Jump ? {
          ...s,
          frog: { ...s.frog, y: s.frog.y + e.y },// change the verioty of the frog to jump up and down
          score: s.score + 1,// increse the score by 1 for sucussful move 
        } :

          // reset the game move the frog and some states to initial values  
          e instanceof Reset ? {
            ...s,
            reset: true,//reset true for future checking 
            score: 0,// turn the score back to 0 
            gameOver: false,// game over turn to false 
            //move frog back to the initail start points 
            frog: {
              ...s.frog,
              x: 200,
              y: 540
            }
          } :
            // return the tick for future actions 
            tick(s, e.elapsed);


  /**
   * The game stream 
   * With the obsevale, the merge is using to merge the game streams for keyboard actions 
   * this section is for the whole game to run which will be run every 10 milliseconds 
   * And it will merge all events togetehr 
   * and call the update view
   */
  const subscription =
    interval(10)//observable usage
      .pipe(
        map(elapsed => new Tick(elapsed)),
        merge(
          startLeftMove, startRightMove, stopLeftMove, stopRightMove),//merge Move 
        merge(startUp, startDown, stopUp, startDown, stopDown),//merge jump
        merge(reset),//merge reset 
        scan(reduceState, initialState)//scan it into reduce 
      ).subscribe(updateView);//update the view of the game 



  /**
   * The main VIEW of the game, 
   * The Updateview function is the function that used to update the view of the whole game.
   * Reason: To make the whole coode readable, just leave all views updating here 
   * These function includes to place all cars, frog, boats, crocodiles etc.
   * The MAIN section of the game/code 
   * 
   * @param s the state of the game waiting to update 
   */
  function updateView(s: State) {
    console.log(s);

    const
      // get the svg to adding things 
      svg = document.getElementById("backgroundLayer")!,
      frog = document.getElementById("frog")!,// get frog from html

      //getting score from the html and update the score from state
      score = document.getElementById("score")
    //updating score
    score ? score.textContent = `Score: ${s.score}` : null;

    //GAME LEVEL : 0, the game level will be change if they player reach the destiniation 
    // This is used to increase the diffucuity of the game by levels 
    // this codes just to show the level on the html 
    const level = document.getElementById("level")!
    level ? level.textContent = `GAME LEVEL : ${s.level}` : null,// updating levels 

      // update the location of frog 
      frog.setAttribute('transform', `translate(${s.frog.x},${s.frog.y})`);

    //This section is for "extension" to give lives for frog
    const life = document.getElementById("life")!// get the liffe variable from frog
    life ?//check found or not 
      s.life != Number(life.innerHTML) ?
        life.textContent = `${s.life}`//updating the life 
        : null
      : null


    // The game over view when the frog dies 
    // 1. update the records if need to
    // 2. show the "game over" texts in svg  
    if (s.gameOver) {
      // used to track the highest score 
      const record = document.getElementById("high")!// get the record variable
      record ?// check record found 
        s.score > Number(record.innerHTML) ?//check is it the new record 
          record.textContent = `${s.score}`//updateing 
          : null
        : null

      // create a new text for game over to annouce to players 
      const over = document.createElementNS(svg.namespaceURI, "text")!;
      // use attr function to reduce the dupilication, which is easier 
      attr(over, {
        id: 'over', x: Constants.CanvasSize / 6, y: Constants.CanvasSize / 2,
        class: "gameover", style: "fill: red;", 'font-size': "5em"
      });// adding all atrribute 
      over.textContent = "Game Over";//add text content 
      svg.appendChild(over);//appending 
    }

    //Remove the game over state
    // if condition check, if reset it is new game
    // so that i have to remove the texts 
    !s.gameOver ?// see not game over 
      document.getElementById('over')! ? svg.removeChild(document.getElementById('over')!) : null// removing
      : null// do nothing 

    /**
     *  The function for the body view of rects 
     * this is a curried function that used to add rect attributes 
     * because the game is based on the rects 
     * @param b the body obejct 
     */
    const updateBodyView = (b: Body) => {
      //currying 
      function createBodyView() {
        const v = document.createElementNS(svg.namespaceURI, "rect")
        // create new rect on the svg
        v.setAttribute("id", b.id);
        v.classList.add(b.viewType)
        svg.appendChild(v)//adding child
        return v;
      }
      let v = document.getElementById(b.id) || createBodyView();
      // the attr function to set all attributes for v 
      attr(v, { x: b.x, y: b.y, width: b.width, height: b.height, style: "fill:" + String(b.colour) })
    }
    // using the updateBodyView function above 
    //The reason i do this just to simply reduce the duplication,
    // they just using same logic to updates 
    s.bugs.forEach(updateBodyView);
    s.car.forEach(updateBodyView);//update every car
    s.planks.forEach(updateBodyView);//update the planks 
    s.boats.forEach(updateBodyView);//update the planks 
    s.desti.forEach(updateBodyView);// destinations of the game 
    s.croco.forEach(updateBodyView);

    // check Winning 
    // The if condition is checking wheather all the destination is reached.
    // I have used the destination colour to check the winning process 
    if (s.desti.filter(b => b.colour == "red").length == 4) {
      // use filtter to get the number of the achevied destination 

      // used to track the highest score 
      const record = document.getElementById("high")!
      record ?// make sure the record extis 
        s.score > Number(record.innerHTML) ?// check is it new record 
          record.textContent = `${s.score}`//updating into the html
          : null//do nothing 
        : null//do nothing 

      //show the win status on the ssvg
      const v = document.createElementNS(svg.namespaceURI, "text")!;
      attr(v, {
        id: 'win', x: Constants.CanvasSize / 6, y: Constants.CanvasSize / 2,
        class: "Win", style: "fill: pink;", 'font-size': "2em"
      });
      v.textContent = "You Wins";
      svg.appendChild(v);
    }

  }

}




/**
 * This function is used to setAsstribute into the element, which passing into the element and the oblects list 
 * @param e the body 
 * @param o the attribute for the body, normally a rect attribute 
 * The reason why I used this function becasue i want to reduce the dupilication of the game 
 * This function helps me to set the attributes for rect and some other objects 
 */
const
  attr = (e: Element, o: any) => {
    for (const k in o) e.setAttribute(k, String(o[k]))
    // using for loop to take it over into the attribute
  }



//The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    frogGame();
  };
}

