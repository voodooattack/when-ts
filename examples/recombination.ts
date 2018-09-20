import { MachineState, StateMachine, when } from '../src';

interface NPCState extends MachineState {
  health: number;
  wealth: number;
}

class Agent extends StateMachine<NPCState> {
  constructor() {
    super({ health: 100, wealth: 100 });
  }

  @when(state => state.counter < state.current)
  flee({ health }: NPCState) {
    return { counter: health + 1 };
  }

}

const agent = new Agent();

const result = agent.run();

if (result) {
  console.log(result);
}
