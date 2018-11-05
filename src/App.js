import React, {Component} from 'react';
import logo from './logo.svg';
import './App.css';
import Tone from 'tone';
import SampleLibrary from './Tonejs-Instruments'
import Gamepad from './gamepad'

function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
}

class GamePadComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      info: ""
    }
  }
  componentDidMount() {
    const gamepad = new Gamepad();

gamepad.on('connect', e => {
    console.log(`controller ${e.index} connected!`);
});


    window.addEventListener("gamepadconnected", this.gamePadConnected);
    this.setState({info: "Waiting for gamepad connection"})
  }

  componentWillUnmount() {
    window.removeEventListener("gamepadconnected", this.gamePadConnected);

    if (this.reading_game_pad) {
      cancelAnimationFrame(this.reading_game_pad);
      this.reading_game_pad = null;
    }
  }
  gamePadConnected = (e) => {
    this.setState({info:"Gamepad connected"})
    if (this.reading_game_pad) {
      return;
    }

    this.readGamePad();
  }

  readGamePad = () => {
    this.reading_game_pad = null;

    var gamepads = navigator.getGamepads
      ? navigator.getGamepads()
      : (
        navigator.webkitGetGamepads
        ? navigator.webkitGetGamepads
        : []);
    var buttons = [];
    for (var i = 0; i < gamepads.length; i++) {
      var gp = gamepads[i];
      if (gp && gp.connected && gp.buttons.length > 0) {
        buttons = gp.buttons.map(b => b.pressed);
      }
    }
    if (this.lastbuttons) {
      var changed = false;
      buttons.forEach((b, i) => {
        if (this.lastbuttons[i] !== b) {
          this.buttonChanged(i, b);
          changed = true;
        }
      })
      if (changed) {
        this.setState({buttons: buttons})
      }
    }
    this.lastbuttons = buttons;
    // If the length of the buttons is 0, then we didn't find any
    // gamepads, so it must have been disconnected.
    if (buttons.length !== 0) {
      this.reading_game_pad = requestAnimationFrame(this.readGamePad);
    }
  }
  buttonChanged(button, value) {
    this.props.onButtonChanged(button,value);
  }

  render() {
    return (<div>{this.state.info}</div>);
  }
}

class ToneC extends Component {
  constructor(props) {
    super(props);
    let audioCtx = new AudioContext(); //Run / Edit
    this.audioCtx = audioCtx

    //this.piano = SampleLibrary.load({instruments: "violin", baseUrl: "/tonejs-instruments/samples/"});

    Tone.Buffer.on('load', function() {
      console.log("LOADED")
    });
    Tone.Buffer.on('error', function() {
      console.log("ERROR");
      throw("FOO")
    })

    //this.piano.toMaster();

    this.oscs = [];

    this.state = {}
  }
  render() {
    var notes = this.props.notes; //["A4","D4"];
    var osc;
    while (this.oscs.length > notes.length) {
      console.log("Deleting osc");
      osc = this.oscs.pop();
      osc.disconnect()
      osc.stop();
    }
    while (this.oscs.length < notes.length) {
      console.log("Creating osc")
      osc = this.audioCtx.createOscillator();
      osc.frequency.value = (new Tone.Frequency("D6")).toFrequency();
      osc.connect(this.audioCtx.destination);
      osc.start();
      this.oscs.push(osc);
    }

    var oschtml = [];
    notes.forEach((n, i) => {
      var freq;
      if (isLetter(n.toString()[0])) {
        freq = (new Tone.Frequency(n)).toFrequency();
      } else {
        freq = n;
      }
      this.oscs[i].frequency.value = freq;
      //this.piano.triggerAttack(freq);

      oschtml.push((<div key={i}>Freq: {n}
        ({freq.toFixed(2)})</div>))
    })

    return (<div>{oschtml}</div>);
  }
}

function scale(starting_note, count) {
  console.log("Making scale")
  var pattern = [
    2,
    2,
    1,
    2,
    2,
    2,
    1
  ];

  var note = new Tone.Frequency(starting_note);

  // Push through to find the actual starting note for this key
  var res = [note.toNote()];

  var pattern_index = 0;
  for (var i = 0; i < count; ++i) {
    var t = pattern[pattern_index];
    pattern_index = (pattern_index + 1) % pattern.length;
    note = note.transpose(t);
    res.push(note.toNote());
  }
  return res;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

class GuessThatNote extends Component {
  constructor(props) {
    super(props);
    this.notes = scale("G3", 15);
    var n = this.randomNote();
    this.state = {
      note: n,
      second: this.offset(n)
    }
  }
  randomNote() {
    return this.notes[getRandomInt(0, this.notes.length)]
  }
  offset(note) {
    note = new Tone.Frequency(note);
    var offsets = [2, 4, 5, 7];
    return note.transpose(offsets[getRandomInt(0, offsets.length)]).toNote()
  }
  newNote = () => {
    var n = this.randomNote();
    this.setState({note: n, second: this.offset(n)})
  }
  buttonCheck = (b,v) => {
    if(v) {
      this.newNote();
    }
  }
  render() {
    return (<div>
      <div>{this.notes.join(',')}</div>
      <div>{this.state.note}</div>
      <div style={{fontSize: '300%'}}>
      <ToneC  notes={[this.state.note]}/>
      </div>
      <button onClick={this.newNote}>New Note</button>
      <GamePadComponent onButtonChanged={this.buttonCheck}/>
    </div>);
  }
}

class App extends Component {
  render() {
    return (<GuessThatNote/>);
  }
}

class AppZ extends Component {
  constructor(props) {
    super(props);
    this.state = {
      freqs: [440, 750]
    }
  }

  setFreq = (e) => {
    var newfreqs = this.state.freqs.slice();
    newfreqs[1] = e.target.value;
    this.setState({freqs: newfreqs})
  }

  render() {
    return (<div className="App">
      <input style={{
          width: '100%'
        }} type='range' onChange={this.setFreq} value={this.state.freq} min={200} max={1300} step={0.05}/>
      <ToneC notes={this.state.freqs}/>
    </div>);
  }
}

export default App;
