var RHcostDb = require('./CostAlgorithm.js').createCostDatabase();
var LHcostDb = require('./LHCostAlgorithm.js').createLHCostDatabase();

var mod = module.exports;

mod.notes = {0:'C', 1:'C#', 2:'D', 3:'Eb', 4:'E', 5:'F', 6:'F#', 7:'G', 8:'G#', 9:'A', 10:'Bb', 11:'B'};

var fingerOptions = {
  1: [[1], [2], [3], [4], [5]],
  2: [[1,2], [1,3], [1,4], [1,5], [2,3], [2,4], [2,5], [3,4], [3,5], [4,5]],
  3: [[1,2,3], [1,2,4], [1,2,5], [1,3,4], [1,3,5], [1,4,5], [2,3,4], [2,3,5], [2,4,5], [3,4,5]],
  4: [[1,2,3,4], [1,2,3,5], [1,2,4,5], [1,3,4,5], [2,3,4,5]],
  5: [[1,2,3,4,5]]
};

var LHfingerOptions = {
  1: [[5], [4], [3], [2], [1]],
  2: [[5,4], [5,3], [5,2], [5,1], [4,3], [4,2], [4,1], [3,2], [3,1], [2,1]],
  3: [[5,4,3], [5,4,2], [5,4,1], [5,3,2], [5,3,1], [5,2,1], [4,3,2], [4,3,1], [4,2,1], [3,2,1]],
  4: [[5,4,3,2], [5,4,3,1], [5,4,2,1], [5,3,2,1], [4,3,2,1]],
  5: [[5,4,3,2,1]]
};

var getAllFingerOptions = function(numFingers) {
  var results = [];
  var fingOptions = [-5,-4,-3,-2,-1,1,2,3,4,5];

  var walker = function(numFingers, currentFingers, fingerOptions) {
    if (currentFingers.length === numFingers) {
      results.push(currentFingers.slice());
      return;
    }

    for (var i = 0; i < fingerOptions.length; i++) {
      currentFingers.push(fingerOptions[i]);
      var current = currentFingers;
      var temp = fingerOptions.slice();
      temp.splice(0,i+1);
      walker(numFingers,current, temp);
      currentFingers.pop();
    }
  };
  walker(numFingers, [], fingOptions);
  return results;
};
//initialize finger options object
var allFingerOptions = {};
for (var i = 1; i <=10; i++) {
  allFingerOptions[i] = getAllFingerOptions(i);
}

var endCap = [
  {notes: ['endCap'], fingers: [1]},
  {notes: ['endCap'], fingers: [1]},
  {notes: ['endCap'], fingers: [1]},
  {notes: ['endCap'], fingers: [1]},
  {notes: ['endCap'], fingers: [1]},
];

var makeNoteNode = function(notes, fingers) {
  //the notes and fingers property can have either one or multiple notes. 
  this.notes = notes;     //this is an array of array pairs, with notes and startTimes.
  this.fingers = fingers; // this is an array of finger options. 
  this.nodeScore = 0;
  this.bestPrev = undefined;
};

var makeLayer = function(notes) {
  var sortedNotes = notes.sort(function(a,b) {return a[0]-b[0]});
  var layer = [];
  var options = allFingerOptions[sortedNotes.length]; // this grabs the appropriate list of options. 
  for (var i = 0; i < options.length; i++) {
    var fingerChoice = options[i];
    var node = new makeNoteNode(sortedNotes, fingerChoice);
    layer.push(node);
  }
  return layer;
};

var makeLHLayer = function(notes) {
  var sortedNotes = notes.sort(function(a,b) {return a[0]-b[0]});
  var layer = [];
  var options = LHfingerOptions[sortedNotes.length]; // this grabs the appropriate list of options. 
  for (var i = 0; i < options.length; i++) {
    var fingerChoice = options[i];
    var node = new makeNoteNode(sortedNotes, fingerChoice);
    layer.push(node);
  }
  return layer;
};

var findNoteHolder = function(curPlaying, note) {
  for (var i = 0; i < curPlaying.length; i++) {
    if (curPlaying[i][0] === note) {
      return i;
    }
  }
};

mod.makeNoteTrellis = function(midiData) {
  // debugger;
  var curPlaying = [];
  var lastWasOn = false;
  var trellis = [];
  trellis.push(endCap); //this is convenience so we don't have to have special conditions for the traversal loop

  for (var pair = 0; pair < midiData.length; pair++) {
    var eventData = midiData[pair][0].event;
    var note = eventData.noteNumber;
    var newLayer, notePlace; 
    if (eventData.subtype === 'noteOn') {
      var startTime = eventData.startTime;
      curPlaying.push([note, startTime]);
      lastWasOn = true;
    }
    if (eventData.subtype === 'noteOff') {
      if (lastWasOn) {
        //must pass it a copy of curPlaying, or else everythang gits all messed up
        newLayer = makeLayer(curPlaying.slice());
        trellis.push(newLayer);
        notePlace = findNoteHolder(curPlaying, note);
        curPlaying.splice(notePlace, 1);
        lastWasOn = false;
      }else {
        notePlace = findNoteHolder(curPlaying, note);
        curPlaying.splice(notePlace, 1);
        lastWasOn = false;
      }
    }
  }
  return trellis;
};

mod.makeRHNoteTrellis = function(midiData) {
  // debugger;
  var curPlaying = [];
  var lastWasOn = false;
  var trellis = [];
  trellis.push(endCap); //this is convenience so we don't have to have special conditions for the traversal loop

  for (var pair = 0; pair < midiData.length; pair++) {
    var eventData = midiData[pair][0].event;
    var note = eventData.noteNumber;
    var newLayer, notePlace;
    if (note >= 60 && eventData.subtype === 'noteOn') {
      var startTime = eventData.startTime;
      curPlaying.push([note, startTime]);
      lastWasOn = true;
    }
    if (note >= 60 && eventData.subtype === 'noteOff') {
      if (lastWasOn) {
        //must pass it a copy of curPlaying, or else everythang gits all messed up
        newLayer = makeLayer(curPlaying.slice());
        trellis.push(newLayer);
        notePlace = findNoteHolder(curPlaying, note);
        curPlaying.splice(notePlace, 1);
        lastWasOn = false;
      }else {
        notePlace = findNoteHolder(curPlaying, note);
        curPlaying.splice(notePlace, 1);
        lastWasOn = false;
      }
    }
  }
  return trellis;
};

mod.makeLHNoteTrellis = function(midiData) {
  // debugger;
  var curPlaying = [];
  var lastWasOn = false;
  var trellis = [];
  trellis.push(endCap); //this is convenience so we don't have to have special conditions for the traversal loop

  for (var pair = 0; pair < midiData.length; pair++) {
    var eventData = midiData[pair][0].event;
    var note = eventData.noteNumber;
    var newLayer, notePlace;
    if (note <= 60 && eventData.subtype === 'noteOn') {
      var startTime = eventData.startTime;
      curPlaying.push([note, startTime]);
      lastWasOn = true;
    }
    if (note <= 60 && eventData.subtype === 'noteOff') {
      if (lastWasOn) {
        //must pass it a copy of curPlaying, or else everythang gits all messed up
        newLayer = makeLHLayer(curPlaying.slice());
        trellis.push(newLayer);
        notePlace = findNoteHolder(curPlaying, note);
        curPlaying.splice(notePlace, 1);
        lastWasOn = false;
      }else {
        notePlace = findNoteHolder(curPlaying, note);
        curPlaying.splice(notePlace, 1);
        lastWasOn = false;
      }
    }
  }
  return trellis;
};

mod.makeRHnotesData = function(midiData) {
  var noteData = [];
  for (var pair = 0; pair < midiData.length; pair++) {
    var eventData = midiData[pair][0].event;
    if (eventData.noteNumber >= 60 && eventData.subtype === 'noteOn') {
      noteData.push(midiData[pair]);
    }
  }
  return noteData;
};

var computeRHCost = function(n1,n2,f1,f2) {
  if (n1 === 'endCap' || n2 === 'endCap') {
    return 0;
  }
  var key = n1 + ',' + n2 + ',' + f1 + ',' + f2;
  return RHcostDb[key];
};

var computeLHCost = function(n1,n2,f1,f2) {
  if (n1 === 'endCap' || n2 === 'endCap') {
    return 0;
  }
  f1 = Math.abs(f1);
  f2 = Math.abs(f2);
  var key = n1 + ',' + n2 + ',' + f1 + ',' + f2;
  return LHcostDb[key];
};

mod.findMin = function(layer) {
  var minNode;
  var minScore = Infinity;
  for (var node = 0; node < layer.length; node++) {
    if (layer[node].nodeScore < minScore) {
      minScore = layer[node].nodeScore;
      minNode = node;
    }
  }
  return minNode;
};

mod.distributePath = function(bestPathObj, midiData) {
  var result = [];
  for (var pair = 0; pair < midiData.length; pair++) {
    var eventData = midiData[pair][0].event;
    var note = eventData.noteNumber;
    if (eventData.subtype === 'noteOn') {
      var startTime = eventData.startTime;
      var key = note + ',' + startTime;
      var finger = bestPathObj[key];
      console.log('Note: ' + note + '/ Finger: ' + finger);
    }
  }
  return result;
};

mod.addStartTimes = function(midiData) {
  //initialize counter variable at zero;
  //set first item startTime to counter variable. 
  //increment counter by TicksToNextEvent for either noteOn or noteOff events
  var curStartTime = 0;
  for (var pair = 0; pair < midiData.length; pair++) {
    var eventData = midiData[pair][0].event;
    if (eventData.subtype === 'noteOff') {
      curStartTime += eventData.deltaTime;  //deltaTime is really 'ticksToNextEvent'
    }else if(eventData.subtype === 'noteOn') {
      eventData.startTime = curStartTime;
      curStartTime += eventData.deltaTime;
    }
  }
  return midiData;
};

mod.getSplitData = function(node) {
  var result = {
    right: {
      notes: [],
      fingers:[]
    },
    left: {
      notes: [],
      fingers:[]
    }
  };
  for (var i = 0; i < node.fingers.length; i++) {
    if (node.fingers[i] > 0) {
      result.right.fingers.push(node.fingers[i]);
      result.right.notes.push(node.notes[i]);
    }else {
      result.left.fingers.push(node.fingers[i]);
      result.left.notes.push(node.notes[i]);
    }
  }
  return result;
};

mod.calcCost = function(curNode, prevNode, whichHand) {
  var costFunction = whichHand === 'RH' ? computeRHCost : computeLHCost;
  var totalCost = 0;

  for (var i = 0; i < curNode.notes.length; i++) {       //go through each note in the current Node
    var curNote = curNode.notes[i][0];  //this grabs just the note, because the notes property has pairs of values. First is note, second is starTime.
    var curFinger = curNode.fingers[i];
    var hasNextNote = curNode.notes[i+1] || false;
    var nextFinger = curNode.fingers[i+1];
    if(hasNextNote) {
      //this helps add the "state" cost of actually using those fingers for that chord. This isn't captured by the transition costs 
      totalCost += costFunction(curNote, hasNextNote[0], curFinger, nextFinger);
    }
    for (var j = 0; j < prevNode.notes.length; j++) {   //add up scores for each of the previous nodes notes trying to get to current node note.
      var prevNote = prevNode.notes[j][0];
      var prevFinger = prevNode.fingers[j];

      var transCost = costFunction(prevNote, curNote, prevFinger, curFinger);
      totalCost += transCost;
    }
  }
  return totalCost;
}











