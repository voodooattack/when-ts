import { MachineState, StateMachine, when } from '../src';

type Position = [number, number];

interface NPCState extends MachineState {
  name: string;
  health: number;
  wealth: number;
  position: Position;
  targetPosition?: Position;
  lowHealthThreshold: number;
  maximumSpeed: number;
  walkingSpeed: number;
}

class Agent extends StateMachine<NPCState> {

  constructor({
      name,
      targetPosition,
      lowHealthThreshold = 50,
      position = [0, 0],
      walkingSpeed = 0,
      maximumSpeed = 1,
      health = 100,
      wealth = 1000
    }: Pick<NPCState, 'name'> & Partial<NPCState>
  )
  {
    const initial: NPCState = {
      name,
      lowHealthThreshold,
      targetPosition,
      position,
      walkingSpeed,
      maximumSpeed,
      health,
      wealth
    };
    super(initial);
  }

  flee(state: NPCState) {
    const { name, health, maximumSpeed } = state;
    console.log(`${name} starts to flee because they have ${health} health remaining.`);
    // run like the wind to a random position
    return this.move(
      state,
      [Math.random() * 1000 - 500, Math.random() * 1000 - 500],
      maximumSpeed
    );
  }

  attack({ name, health }: NPCState) {
    console.log(`${name} starts to attack with their bow, because they have ${health} health remaining.`);
  }

  move(state: NPCState, targetPosition: Position, speed: number) {
    return { targetPosition, walkingSpeed: Math.min(speed, state.maximumSpeed) };
  }

  perform(...args: Partial<NPCState>[]) {
    return Object.assign(Object.create(null), ...args);
  }

  @when<NPCState>(state => !!state.walkingSpeed && !!state.targetPosition)
  walkIfNecessary({ position, targetPosition, walkingSpeed }: NPCState) {
    const [xFrom, yFrom] = position;
    const [xTo, yTo] = targetPosition!;
    const xSpeed = xTo < xFrom ? -Math.min(walkingSpeed, xFrom - xTo) :
      Math.min(walkingSpeed, xFrom - xTo);
    const ySpeed = yTo < yFrom ? -Math.min(walkingSpeed, yFrom - yTo) :
      Math.min(walkingSpeed, yFrom - yTo);
    return { position: [xFrom + xSpeed, yFrom + ySpeed] };
  }

  @when<NPCState>(state =>
    !!state.targetPosition &&
    state.position[0] === state.targetPosition[0] &&
    state.position[1] === state.targetPosition[1])
  arriveAtDestination() {
    return { targetPosition: undefined };
  }

}

class Coward extends Agent {
  @when<NPCState>(({ health }) => health < 50)
  fleeOnLowHealth(state: NPCState) {
    return super.flee(state);
  }
}

class Badass extends Agent {
  @when<NPCState>(({ health }) => health < 50)
  attackOnLowHealth(state: NPCState) {
    return super.attack(state);
  }
}

const agents = [
  new Coward({ name: 'Joey', lowHealthThreshold: 70 }),
  new Badass({ name: 'Marissa', lowHealthThreshold: 20 })
];

while (true) {
  let change = false;
  for (let agent of agents) {
    change = change || !!agent.step();
  }
  if (!change) break;
  change = false;
}

