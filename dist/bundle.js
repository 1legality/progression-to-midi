"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/midi-writer-js/build/index.js
  var require_build = __commonJS({
    "node_modules/midi-writer-js/build/index.js"(exports, module) {
      "use strict";
      var Constants = {
        VERSION: "3.1.1",
        HEADER_CHUNK_TYPE: [77, 84, 104, 100],
        HEADER_CHUNK_LENGTH: [0, 0, 0, 6],
        HEADER_CHUNK_FORMAT0: [0, 0],
        HEADER_CHUNK_FORMAT1: [0, 1],
        HEADER_CHUNK_DIVISION: [0, 128],
        TRACK_CHUNK_TYPE: [77, 84, 114, 107],
        META_EVENT_ID: 255,
        META_SMTPE_OFFSET: 84
      };
      var fillStr = (s, n) => Array(Math.abs(n) + 1).join(s);
      function isNamed(src) {
        return src !== null && typeof src === "object" && typeof src.name === "string" ? true : false;
      }
      function isPitch(pitch) {
        return pitch !== null && typeof pitch === "object" && typeof pitch.step === "number" && typeof pitch.alt === "number" ? true : false;
      }
      var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
      var STEPS_TO_OCTS = FIFTHS.map(
        (fifths) => Math.floor(fifths * 7 / 12)
      );
      function encode(pitch) {
        const { step, alt, oct, dir = 1 } = pitch;
        const f = FIFTHS[step] + 7 * alt;
        if (oct === void 0) {
          return [dir * f];
        }
        const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
        return [dir * f, dir * o];
      }
      var NoNote = { empty: true, name: "", pc: "", acc: "" };
      var cache = /* @__PURE__ */ new Map();
      var stepToLetter = (step) => "CDEFGAB".charAt(step);
      var altToAcc = (alt) => alt < 0 ? fillStr("b", -alt) : fillStr("#", alt);
      var accToAlt = (acc) => acc[0] === "b" ? -acc.length : acc.length;
      function note(src) {
        const stringSrc = JSON.stringify(src);
        const cached = cache.get(stringSrc);
        if (cached) {
          return cached;
        }
        const value = typeof src === "string" ? parse(src) : isPitch(src) ? note(pitchName(src)) : isNamed(src) ? note(src.name) : NoNote;
        cache.set(stringSrc, value);
        return value;
      }
      var REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
      function tokenizeNote(str) {
        const m = REGEX.exec(str);
        return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
      }
      var mod = (n, m) => (n % m + m) % m;
      var SEMI = [0, 2, 4, 5, 7, 9, 11];
      function parse(noteName) {
        const tokens = tokenizeNote(noteName);
        if (tokens[0] === "" || tokens[3] !== "") {
          return NoNote;
        }
        const letter = tokens[0];
        const acc = tokens[1];
        const octStr = tokens[2];
        const step = (letter.charCodeAt(0) + 3) % 7;
        const alt = accToAlt(acc);
        const oct = octStr.length ? +octStr : void 0;
        const coord = encode({ step, alt, oct });
        const name = letter + acc + octStr;
        const pc = letter + acc;
        const chroma = (SEMI[step] + alt + 120) % 12;
        const height = oct === void 0 ? mod(SEMI[step] + alt, 12) - 12 * 99 : SEMI[step] + alt + 12 * (oct + 1);
        const midi = height >= 0 && height <= 127 ? height : null;
        const freq = oct === void 0 ? null : Math.pow(2, (height - 69) / 12) * 440;
        return {
          empty: false,
          acc,
          alt,
          chroma,
          coord,
          freq,
          height,
          letter,
          midi,
          name,
          oct,
          pc,
          step
        };
      }
      function pitchName(props) {
        const { step, alt, oct } = props;
        const letter = stepToLetter(step);
        if (!letter) {
          return "";
        }
        const pc = letter + altToAcc(alt);
        return oct || oct === 0 ? pc + oct : pc;
      }
      function isMidi(arg) {
        return +arg >= 0 && +arg <= 127;
      }
      function toMidi(note$1) {
        if (isMidi(note$1)) {
          return +note$1;
        }
        const n = note(note$1);
        return n.empty ? null : n.midi;
      }
      var Utils = (
        /** @class */
        function() {
          function Utils2() {
          }
          Utils2.version = function() {
            return Constants.VERSION;
          };
          Utils2.stringToBytes = function(string) {
            return string.split("").map(function(char) {
              return char.charCodeAt(0);
            });
          };
          Utils2.isNumeric = function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
          };
          Utils2.getPitch = function(pitch, middleC) {
            if (middleC === void 0) {
              middleC = "C4";
            }
            return 60 - toMidi(middleC) + toMidi(pitch);
          };
          Utils2.numberToVariableLength = function(ticks) {
            ticks = Math.round(ticks);
            var buffer = ticks & 127;
            while (ticks = ticks >> 7) {
              buffer <<= 8;
              buffer |= ticks & 127 | 128;
            }
            var bList = [];
            while (true) {
              bList.push(buffer & 255);
              if (buffer & 128)
                buffer >>= 8;
              else {
                break;
              }
            }
            return bList;
          };
          Utils2.stringByteCount = function(s) {
            return encodeURI(s).split(/%..|./).length - 1;
          };
          Utils2.numberFromBytes = function(bytes) {
            var hex = "";
            var stringResult;
            bytes.forEach(function(byte) {
              stringResult = byte.toString(16);
              if (stringResult.length == 1)
                stringResult = "0" + stringResult;
              hex += stringResult;
            });
            return parseInt(hex, 16);
          };
          Utils2.numberToBytes = function(number, bytesNeeded) {
            bytesNeeded = bytesNeeded || 1;
            var hexString = number.toString(16);
            if (hexString.length & 1) {
              hexString = "0" + hexString;
            }
            var hexArray = hexString.match(/.{2}/g);
            var intArray = hexArray.map(function(item) {
              return parseInt(item, 16);
            });
            if (intArray.length < bytesNeeded) {
              while (bytesNeeded - intArray.length > 0) {
                intArray.unshift(0);
              }
            }
            return intArray;
          };
          Utils2.toArray = function(value) {
            if (Array.isArray(value))
              return value;
            return [value];
          };
          Utils2.convertVelocity = function(velocity) {
            velocity = velocity > 100 ? 100 : velocity;
            return Math.round(velocity / 100 * 127);
          };
          Utils2.getTickDuration = function(duration) {
            if (Array.isArray(duration)) {
              return duration.map(function(value) {
                return Utils2.getTickDuration(value);
              }).reduce(function(a, b) {
                return a + b;
              }, 0);
            }
            duration = duration.toString();
            if (duration.toLowerCase().charAt(0) === "t") {
              var ticks = parseInt(duration.substring(1));
              if (isNaN(ticks) || ticks < 0) {
                throw new Error(duration + " is not a valid duration.");
              }
              return ticks;
            }
            var quarterTicks = Utils2.numberFromBytes(Constants.HEADER_CHUNK_DIVISION);
            var tickDuration = quarterTicks * Utils2.getDurationMultiplier(duration);
            return Utils2.getRoundedIfClose(tickDuration);
          };
          Utils2.getRoundedIfClose = function(tick) {
            var roundedTick = Math.round(tick);
            return Math.abs(roundedTick - tick) < 1e-6 ? roundedTick : tick;
          };
          Utils2.getPrecisionLoss = function(tick) {
            var roundedTick = Math.round(tick);
            return roundedTick - tick;
          };
          Utils2.getDurationMultiplier = function(duration) {
            if (duration === "0")
              return 0;
            var match = duration.match(/^(?<dotted>d+)?(?<base>\d+)(?:t(?<tuplet>\d*))?/);
            if (match) {
              var base = Number(match.groups.base);
              var isValidBase = base === 1 || (base & base - 1) === 0;
              if (isValidBase) {
                var ratio = base / 4;
                var durationInQuarters = 1 / ratio;
                var _a = match.groups, dotted = _a.dotted, tuplet = _a.tuplet;
                if (dotted) {
                  var thisManyDots = dotted.length;
                  var divisor = Math.pow(2, thisManyDots);
                  durationInQuarters = durationInQuarters + durationInQuarters * ((divisor - 1) / divisor);
                }
                if (typeof tuplet === "string") {
                  var fitInto = durationInQuarters * 2;
                  var thisManyNotes = Number(tuplet || "3");
                  durationInQuarters = fitInto / thisManyNotes;
                }
                return durationInQuarters;
              }
            }
            throw new Error(duration + " is not a valid duration.");
          };
          return Utils2;
        }()
      );
      var ControllerChangeEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function ControllerChangeEvent2(fields) {
            this.channel = fields.channel - 1 || 0;
            this.controllerValue = fields.controllerValue;
            this.controllerNumber = fields.controllerNumber;
            this.delta = fields.delta || 0;
            this.name = "ControllerChangeEvent";
            this.status = 176;
            this.data = Utils.numberToVariableLength(fields.delta).concat(this.status | this.channel, this.controllerNumber, this.controllerValue);
          }
          return ControllerChangeEvent2;
        }()
      );
      var CopyrightEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function CopyrightEvent2(fields) {
            this.delta = fields.delta || 0;
            this.name = "CopyrightEvent";
            this.text = fields.text;
            this.type = 2;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return CopyrightEvent2;
        }()
      );
      var CuePointEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function CuePointEvent2(fields) {
            this.delta = fields.delta || 0;
            this.name = "CuePointEvent";
            this.text = fields.text;
            this.type = 7;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return CuePointEvent2;
        }()
      );
      var EndTrackEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function EndTrackEvent2(fields) {
            this.delta = (fields === null || fields === void 0 ? void 0 : fields.delta) || 0;
            this.name = "EndTrackEvent";
            this.type = [47, 0];
            this.data = Utils.numberToVariableLength(this.delta).concat(Constants.META_EVENT_ID, this.type);
          }
          return EndTrackEvent2;
        }()
      );
      var InstrumentNameEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function InstrumentNameEvent2(fields) {
            this.delta = fields.delta || 0;
            this.name = "InstrumentNameEvent";
            this.text = fields.text;
            this.type = 4;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return InstrumentNameEvent2;
        }()
      );
      var KeySignatureEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function KeySignatureEvent2(sf, mi) {
            this.name = "KeySignatureEvent";
            this.type = 89;
            var mode = mi || 0;
            sf = sf || 0;
            if (typeof mi === "undefined") {
              var fifths = [
                ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"],
                ["ab", "eb", "bb", "f", "c", "g", "d", "a", "e", "b", "f#", "c#", "g#", "d#", "a#"]
              ];
              var _sflen = sf.length;
              var note2 = sf || "C";
              if (sf[0] === sf[0].toLowerCase())
                mode = 1;
              if (_sflen > 1) {
                switch (sf.charAt(_sflen - 1)) {
                  case "m":
                    mode = 1;
                    note2 = sf.charAt(0).toLowerCase();
                    note2 = note2.concat(sf.substring(1, _sflen - 1));
                    break;
                  case "-":
                    mode = 1;
                    note2 = sf.charAt(0).toLowerCase();
                    note2 = note2.concat(sf.substring(1, _sflen - 1));
                    break;
                  case "M":
                    mode = 0;
                    note2 = sf.charAt(0).toUpperCase();
                    note2 = note2.concat(sf.substring(1, _sflen - 1));
                    break;
                  case "+":
                    mode = 0;
                    note2 = sf.charAt(0).toUpperCase();
                    note2 = note2.concat(sf.substring(1, _sflen - 1));
                    break;
                }
              }
              var fifthindex = fifths[mode].indexOf(note2);
              sf = fifthindex === -1 ? 0 : fifthindex - 7;
            }
            this.data = Utils.numberToVariableLength(0).concat(
              Constants.META_EVENT_ID,
              this.type,
              [2],
              // Size
              Utils.numberToBytes(sf, 1),
              // Number of sharp or flats ( < 0 flat; > 0 sharp)
              Utils.numberToBytes(mode, 1)
            );
          }
          return KeySignatureEvent2;
        }()
      );
      var LyricEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function LyricEvent2(fields) {
            this.delta = fields.delta || 0;
            this.name = "LyricEvent";
            this.text = fields.text;
            this.type = 5;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return LyricEvent2;
        }()
      );
      var MarkerEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function MarkerEvent2(fields) {
            this.delta = fields.delta || 0;
            this.name = "MarkerEvent";
            this.text = fields.text;
            this.type = 6;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return MarkerEvent2;
        }()
      );
      var NoteOnEvent = (
        /** @class */
        function() {
          function NoteOnEvent2(fields) {
            this.name = "NoteOnEvent";
            this.channel = fields.channel || 1;
            this.pitch = fields.pitch;
            this.wait = fields.wait || 0;
            this.velocity = fields.velocity || 50;
            this.tick = fields.tick || null;
            this.delta = null;
            this.data = fields.data;
            this.status = 144;
          }
          NoteOnEvent2.prototype.buildData = function(track, precisionDelta, options) {
            if (options === void 0) {
              options = {};
            }
            this.data = [];
            if (this.tick) {
              this.tick = Utils.getRoundedIfClose(this.tick);
              if (track.tickPointer == 0) {
                this.delta = this.tick;
              }
            } else {
              this.delta = Utils.getTickDuration(this.wait);
              this.tick = Utils.getRoundedIfClose(track.tickPointer + this.delta);
            }
            this.deltaWithPrecisionCorrection = Utils.getRoundedIfClose(this.delta - precisionDelta);
            this.data = Utils.numberToVariableLength(this.deltaWithPrecisionCorrection).concat(this.status | this.channel - 1, Utils.getPitch(this.pitch, options.middleC), Utils.convertVelocity(this.velocity));
            return this;
          };
          return NoteOnEvent2;
        }()
      );
      var NoteOffEvent = (
        /** @class */
        function() {
          function NoteOffEvent2(fields) {
            this.name = "NoteOffEvent";
            this.channel = fields.channel || 1;
            this.pitch = fields.pitch;
            this.velocity = fields.velocity || 50;
            this.tick = fields.tick || null;
            this.data = fields.data;
            this.delta = fields.delta || Utils.getTickDuration(fields.duration);
            this.status = 128;
          }
          NoteOffEvent2.prototype.buildData = function(track, precisionDelta, options) {
            if (options === void 0) {
              options = {};
            }
            if (this.tick === null) {
              this.tick = Utils.getRoundedIfClose(this.delta + track.tickPointer);
            }
            this.deltaWithPrecisionCorrection = Utils.getRoundedIfClose(this.delta - precisionDelta);
            this.data = Utils.numberToVariableLength(this.deltaWithPrecisionCorrection).concat(this.status | this.channel - 1, Utils.getPitch(this.pitch, options.middleC), Utils.convertVelocity(this.velocity));
            return this;
          };
          return NoteOffEvent2;
        }()
      );
      var NoteEvent = (
        /** @class */
        function() {
          function NoteEvent2(fields) {
            this.data = [];
            this.name = "NoteEvent";
            this.pitch = Utils.toArray(fields.pitch);
            this.channel = fields.channel || 1;
            this.duration = fields.duration || "4";
            this.grace = fields.grace;
            this.repeat = fields.repeat || 1;
            this.sequential = fields.sequential || false;
            this.tick = fields.startTick || fields.tick || null;
            this.velocity = fields.velocity || 50;
            this.wait = fields.wait || 0;
            this.tickDuration = Utils.getTickDuration(this.duration);
            this.restDuration = Utils.getTickDuration(this.wait);
            this.events = [];
          }
          NoteEvent2.prototype.buildData = function() {
            var _this = this;
            this.data = [];
            if (this.grace) {
              var graceDuration_1 = 1;
              this.grace = Utils.toArray(this.grace);
              this.grace.forEach(function() {
                var noteEvent = new NoteEvent2({ pitch: _this.grace, duration: "T" + graceDuration_1 });
                _this.data = _this.data.concat(noteEvent.data);
              });
            }
            if (!this.sequential) {
              for (var j = 0; j < this.repeat; j++) {
                this.pitch.forEach(function(p, i) {
                  var noteOnNew;
                  if (i == 0) {
                    noteOnNew = new NoteOnEvent({
                      channel: _this.channel,
                      wait: _this.wait,
                      delta: Utils.getTickDuration(_this.wait),
                      velocity: _this.velocity,
                      pitch: p,
                      tick: _this.tick
                    });
                  } else {
                    noteOnNew = new NoteOnEvent({
                      channel: _this.channel,
                      wait: 0,
                      delta: 0,
                      velocity: _this.velocity,
                      pitch: p,
                      tick: _this.tick
                    });
                  }
                  _this.events.push(noteOnNew);
                });
                this.pitch.forEach(function(p, i) {
                  var noteOffNew;
                  if (i == 0) {
                    noteOffNew = new NoteOffEvent({
                      channel: _this.channel,
                      duration: _this.duration,
                      velocity: _this.velocity,
                      pitch: p,
                      tick: _this.tick !== null ? Utils.getTickDuration(_this.duration) + _this.tick : null
                    });
                  } else {
                    noteOffNew = new NoteOffEvent({
                      channel: _this.channel,
                      duration: 0,
                      velocity: _this.velocity,
                      pitch: p,
                      tick: _this.tick !== null ? Utils.getTickDuration(_this.duration) + _this.tick : null
                    });
                  }
                  _this.events.push(noteOffNew);
                });
              }
            } else {
              for (var j = 0; j < this.repeat; j++) {
                this.pitch.forEach(function(p, i) {
                  var noteOnNew = new NoteOnEvent({
                    channel: _this.channel,
                    wait: i > 0 ? 0 : _this.wait,
                    delta: i > 0 ? 0 : Utils.getTickDuration(_this.wait),
                    velocity: _this.velocity,
                    pitch: p,
                    tick: _this.tick
                  });
                  var noteOffNew = new NoteOffEvent({
                    channel: _this.channel,
                    duration: _this.duration,
                    velocity: _this.velocity,
                    pitch: p
                  });
                  _this.events.push(noteOnNew, noteOffNew);
                });
              }
            }
            return this;
          };
          return NoteEvent2;
        }()
      );
      var PitchBendEvent = (
        /** @class */
        function() {
          function PitchBendEvent2(fields) {
            this.channel = fields.channel || 0;
            this.delta = fields.delta || 0;
            this.name = "PitchBendEvent";
            this.status = 224;
            var bend14 = this.scale14bits(fields.bend);
            var lsbValue = bend14 & 127;
            var msbValue = bend14 >> 7 & 127;
            this.data = Utils.numberToVariableLength(this.delta).concat(this.status | this.channel, lsbValue, msbValue);
          }
          PitchBendEvent2.prototype.scale14bits = function(zeroOne) {
            if (zeroOne <= 0) {
              return Math.floor(16384 * (zeroOne + 1) / 2);
            }
            return Math.floor(16383 * (zeroOne + 1) / 2);
          };
          return PitchBendEvent2;
        }()
      );
      var ProgramChangeEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function ProgramChangeEvent2(fields) {
            this.channel = fields.channel || 0;
            this.delta = fields.delta || 0;
            this.instrument = fields.instrument;
            this.status = 192;
            this.name = "ProgramChangeEvent";
            this.data = Utils.numberToVariableLength(this.delta).concat(this.status | this.channel, this.instrument);
          }
          return ProgramChangeEvent2;
        }()
      );
      var TempoEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function TempoEvent2(fields) {
            this.bpm = fields.bpm;
            this.delta = fields.delta || 0;
            this.tick = fields.tick;
            this.name = "TempoEvent";
            this.type = 81;
            var tempo = Math.round(6e7 / this.bpm);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              [3],
              // Size
              Utils.numberToBytes(tempo, 3)
            );
          }
          return TempoEvent2;
        }()
      );
      var TextEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function TextEvent2(fields) {
            this.delta = fields.delta || 0;
            this.text = fields.text;
            this.name = "TextEvent";
            this.type = 1;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(fields.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return TextEvent2;
        }()
      );
      var TimeSignatureEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function TimeSignatureEvent2(numerator, denominator, midiclockspertick, notespermidiclock) {
            this.name = "TimeSignatureEvent";
            this.type = 88;
            this.data = Utils.numberToVariableLength(0).concat(
              Constants.META_EVENT_ID,
              this.type,
              [4],
              // Size
              Utils.numberToBytes(numerator, 1),
              // Numerator, 1 bytes
              Utils.numberToBytes(Math.log2(denominator), 1),
              // Denominator is expressed as pow of 2, 1 bytes
              Utils.numberToBytes(midiclockspertick || 24, 1),
              // MIDI Clocks per tick, 1 bytes
              Utils.numberToBytes(notespermidiclock || 8, 1)
            );
          }
          return TimeSignatureEvent2;
        }()
      );
      var TrackNameEvent = (
        /** @class */
        /* @__PURE__ */ function() {
          function TrackNameEvent2(fields) {
            this.delta = fields.delta || 0;
            this.name = "TrackNameEvent";
            this.text = fields.text;
            this.type = 3;
            var textBytes = Utils.stringToBytes(this.text);
            this.data = Utils.numberToVariableLength(this.delta).concat(
              Constants.META_EVENT_ID,
              this.type,
              Utils.numberToVariableLength(textBytes.length),
              // Size
              textBytes
            );
          }
          return TrackNameEvent2;
        }()
      );
      var Track = (
        /** @class */
        function() {
          function Track2() {
            this.type = Constants.TRACK_CHUNK_TYPE;
            this.data = [];
            this.size = [];
            this.events = [];
            this.explicitTickEvents = [];
            this.tickPointer = 0;
          }
          Track2.prototype.addEvent = function(events, mapFunction) {
            var _this = this;
            Utils.toArray(events).forEach(function(event, i) {
              if (event instanceof NoteEvent) {
                if (typeof mapFunction === "function") {
                  var properties = mapFunction(i, event);
                  if (typeof properties === "object") {
                    Object.assign(event, properties);
                  }
                }
                if (event.tick !== null) {
                  _this.explicitTickEvents.push(event);
                } else {
                  event.buildData().events.forEach(function(e) {
                    return _this.events.push(e);
                  });
                }
              } else {
                _this.events.push(event);
              }
            });
            return this;
          };
          Track2.prototype.buildData = function(options) {
            var _this = this;
            if (options === void 0) {
              options = {};
            }
            this.data = [];
            this.size = [];
            this.tickPointer = 0;
            var precisionLoss = 0;
            this.events.forEach(function(event) {
              if (event instanceof NoteOnEvent || event instanceof NoteOffEvent) {
                var built = event.buildData(_this, precisionLoss, options);
                precisionLoss = Utils.getPrecisionLoss(event.deltaWithPrecisionCorrection || 0);
                _this.data = _this.data.concat(built.data);
                _this.tickPointer = Utils.getRoundedIfClose(event.tick);
              } else if (event instanceof TempoEvent) {
                _this.tickPointer = Utils.getRoundedIfClose(event.tick);
                _this.data = _this.data.concat(event.data);
              } else {
                _this.data = _this.data.concat(event.data);
              }
            });
            this.mergeExplicitTickEvents();
            if (!this.events.length || !(this.events[this.events.length - 1] instanceof EndTrackEvent)) {
              this.data = this.data.concat(new EndTrackEvent().data);
            }
            this.size = Utils.numberToBytes(this.data.length, 4);
            return this;
          };
          Track2.prototype.mergeExplicitTickEvents = function() {
            var _this = this;
            if (!this.explicitTickEvents.length)
              return;
            this.explicitTickEvents.sort(function(a, b) {
              return a.tick - b.tick;
            });
            this.explicitTickEvents.forEach(function(noteEvent) {
              noteEvent.buildData().events.forEach(function(e) {
                return e.buildData(_this);
              });
              noteEvent.events.forEach(function(event) {
                return _this.mergeSingleEvent(event);
              });
            });
            this.explicitTickEvents = [];
            this.buildData();
          };
          Track2.prototype.mergeTrack = function(track) {
            var _this = this;
            this.buildData();
            track.buildData().events.forEach(function(event) {
              return _this.mergeSingleEvent(event);
            });
            return this;
          };
          Track2.prototype.mergeSingleEvent = function(event) {
            if (!this.events.length) {
              this.addEvent(event);
              return;
            }
            var lastEventIndex;
            for (var i = 0; i < this.events.length; i++) {
              if (this.events[i].tick > event.tick)
                break;
              lastEventIndex = i;
            }
            var splicedEventIndex = lastEventIndex + 1;
            event.delta = event.tick - this.events[lastEventIndex].tick;
            this.events.splice(splicedEventIndex, 0, event);
            for (var i = splicedEventIndex + 1; i < this.events.length; i++) {
              this.events[i].delta = this.events[i].tick - this.events[i - 1].tick;
            }
          };
          Track2.prototype.removeEventsByName = function(eventName) {
            var _this = this;
            this.events.forEach(function(event, index) {
              if (event.name === eventName) {
                _this.events.splice(index, 1);
              }
            });
            return this;
          };
          Track2.prototype.setTempo = function(bpm, tick) {
            if (tick === void 0) {
              tick = 0;
            }
            return this.addEvent(new TempoEvent({ bpm, tick }));
          };
          Track2.prototype.setTimeSignature = function(numerator, denominator, midiclockspertick, notespermidiclock) {
            return this.addEvent(new TimeSignatureEvent(numerator, denominator, midiclockspertick, notespermidiclock));
          };
          Track2.prototype.setKeySignature = function(sf, mi) {
            return this.addEvent(new KeySignatureEvent(sf, mi));
          };
          Track2.prototype.addText = function(text) {
            return this.addEvent(new TextEvent({ text }));
          };
          Track2.prototype.addCopyright = function(text) {
            return this.addEvent(new CopyrightEvent({ text }));
          };
          Track2.prototype.addTrackName = function(text) {
            return this.addEvent(new TrackNameEvent({ text }));
          };
          Track2.prototype.addInstrumentName = function(text) {
            return this.addEvent(new InstrumentNameEvent({ text }));
          };
          Track2.prototype.addMarker = function(text) {
            return this.addEvent(new MarkerEvent({ text }));
          };
          Track2.prototype.addCuePoint = function(text) {
            return this.addEvent(new CuePointEvent({ text }));
          };
          Track2.prototype.addLyric = function(text) {
            return this.addEvent(new LyricEvent({ text }));
          };
          Track2.prototype.polyModeOn = function() {
            var event = new NoteOnEvent({ data: [0, 176, 126, 0] });
            return this.addEvent(event);
          };
          Track2.prototype.setPitchBend = function(bend) {
            return this.addEvent(new PitchBendEvent({ bend }));
          };
          Track2.prototype.controllerChange = function(number, value, channel, delta) {
            return this.addEvent(new ControllerChangeEvent({ controllerNumber: number, controllerValue: value, channel, delta }));
          };
          return Track2;
        }()
      );
      var VexFlow = (
        /** @class */
        function() {
          function VexFlow2() {
          }
          VexFlow2.prototype.trackFromVoice = function(voice, options) {
            var _this = this;
            if (options === void 0) {
              options = { addRenderedAccidentals: false };
            }
            var track = new Track();
            var wait = [];
            voice.tickables.forEach(function(tickable) {
              if (tickable.noteType === "n") {
                track.addEvent(new NoteEvent({
                  pitch: tickable.keys.map(function(pitch, index) {
                    return _this.convertPitch(pitch, index, tickable, options.addRenderedAccidentals);
                  }),
                  duration: _this.convertDuration(tickable),
                  wait
                }));
                wait = [];
              } else if (tickable.noteType === "r") {
                wait.push(_this.convertDuration(tickable));
              }
            });
            if (wait.length > 0) {
              track.addEvent(new NoteEvent({ pitch: "[c4]", duration: "0", wait, velocity: "0" }));
            }
            return track;
          };
          VexFlow2.prototype.convertPitch = function(pitch, index, note2, addRenderedAccidentals) {
            var _a;
            if (addRenderedAccidentals === void 0) {
              addRenderedAccidentals = false;
            }
            var pitchParts = pitch.split("/");
            var accidentals = pitchParts[0].substring(1).replace("n", "");
            if (addRenderedAccidentals) {
              (_a = note2.getAccidentals()) === null || _a === void 0 ? void 0 : _a.forEach(function(accidental) {
                if (accidental.index === index) {
                  if (accidental.type === "n") {
                    accidentals = "";
                  } else {
                    accidentals += accidental.type;
                  }
                }
              });
            }
            return pitchParts[0][0] + accidentals + pitchParts[1];
          };
          VexFlow2.prototype.convertDuration = function(note2) {
            return "d".repeat(note2.dots) + this.convertBaseDuration(note2.duration) + (note2.tuplet ? "t" + note2.tuplet.num_notes : "");
          };
          VexFlow2.prototype.convertBaseDuration = function(duration) {
            switch (duration) {
              case "w":
                return "1";
              case "h":
                return "2";
              case "q":
                return "4";
              default:
                return duration;
            }
          };
          return VexFlow2;
        }()
      );
      var Header = (
        /** @class */
        /* @__PURE__ */ function() {
          function Header2(numberOfTracks) {
            this.type = Constants.HEADER_CHUNK_TYPE;
            var trackType = numberOfTracks > 1 ? Constants.HEADER_CHUNK_FORMAT1 : Constants.HEADER_CHUNK_FORMAT0;
            this.data = trackType.concat(
              Utils.numberToBytes(numberOfTracks, 2),
              // two bytes long,
              Constants.HEADER_CHUNK_DIVISION
            );
            this.size = [0, 0, 0, this.data.length];
          }
          return Header2;
        }()
      );
      var Writer = (
        /** @class */
        function() {
          function Writer2(tracks, options) {
            if (options === void 0) {
              options = {};
            }
            this.tracks = Utils.toArray(tracks);
            this.options = options;
          }
          Writer2.prototype.buildData = function() {
            var _this = this;
            var data = [];
            data.push(new Header(this.tracks.length));
            this.tracks.forEach(function(track) {
              data.push(track.buildData(_this.options));
            });
            return data;
          };
          Writer2.prototype.buildFile = function() {
            var build = [];
            this.buildData().forEach(function(d) {
              return build = build.concat(d.type, d.size, d.data);
            });
            return new Uint8Array(build);
          };
          Writer2.prototype.base64 = function() {
            if (typeof btoa === "function") {
              var binary = "";
              var bytes = this.buildFile();
              var len = bytes.byteLength;
              for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              return btoa(binary);
            }
            return Buffer.from(this.buildFile()).toString("base64");
          };
          Writer2.prototype.dataUri = function() {
            return "data:audio/midi;base64," + this.base64();
          };
          Writer2.prototype.setOption = function(key, value) {
            this.options[key] = value;
            return this;
          };
          Writer2.prototype.stdout = function() {
            return process.stdout.write(Buffer.from(this.buildFile()));
          };
          return Writer2;
        }()
      );
      var main = {
        Constants,
        ControllerChangeEvent,
        CopyrightEvent,
        CuePointEvent,
        EndTrackEvent,
        InstrumentNameEvent,
        KeySignatureEvent,
        LyricEvent,
        MarkerEvent,
        NoteOnEvent,
        NoteOffEvent,
        NoteEvent,
        PitchBendEvent,
        ProgramChangeEvent,
        TempoEvent,
        TextEvent,
        TimeSignatureEvent,
        Track,
        TrackNameEvent,
        Utils,
        VexFlow,
        Writer
      };
      module.exports = main;
    }
  });

  // MidiGenerator.ts
  var import_midi_writer_js, NOTES, INTERVALS, CHORD_FORMULAS, TPQN, OCTAVE_ADJUSTMENT_THRESHOLD, MidiGenerator;
  var init_MidiGenerator = __esm({
    "MidiGenerator.ts"() {
      "use strict";
      import_midi_writer_js = __toESM(require_build());
      NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      INTERVALS = {
        P1: 0,
        m2: 1,
        M2: 2,
        m3: 3,
        M3: 4,
        P4: 5,
        A4: 6,
        d5: 6,
        P5: 7,
        A5: 8,
        m6: 8,
        M6: 9,
        d7: 9,
        m7: 10,
        M7: 11,
        P8: 12,
        m9: 13,
        M9: 14,
        A9: 15,
        P11: 17,
        A11: 18,
        m13: 20,
        M13: 21
      };
      CHORD_FORMULAS = {
        // --- Basic Triads ---
        "": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
        // Default to major
        "maj": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
        "M": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
        // Alias for major
        "m": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
        "min": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
        // Alias for minor
        "dim": [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5],
        "aug": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5],
        "+": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5],
        // Alias for augmented
        // --- Suspended Chords ---
        "sus4": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5],
        "sus": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5],
        // Alias for sus4
        "sus2": [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5],
        // --- Power Chord ---
        "5": [INTERVALS.P1, INTERVALS.P5],
        // --- "Add" Chords (Triads + added note, no 7th) ---
        "add9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M9],
        // Major add 9
        "add2": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M2],
        // Major add 2 (often same sound as add9)
        "m(add9)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M9],
        // Minor add 9
        "madd9": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M9],
        // Alias for m(add9)
        "m(add2)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M2],
        // Minor add 2
        // --- Sixth Chords ---
        "6": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M6],
        // Major 6th
        "maj6": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M6],
        // Alias for Major 6th
        "m6": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M6],
        // Minor 6th
        "min6": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M6],
        // Alias for Minor 6th
        "6/9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M6, INTERVALS.M9],
        // 6th chord with added 9th
        "m6/9": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M6, INTERVALS.M9],
        // Minor 6th chord with added 9th
        // --- Seventh Chords ---
        "7": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7],
        // Dominant 7th
        "maj7": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7],
        // Major 7th
        "M7": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7],
        // Alias for Major 7th
        "m7": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7],
        // Minor 7th
        "min7": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7],
        // Alias for Minor 7th
        "m(maj7)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7],
        // Minor-Major 7th
        "mM7": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7],
        // Alias for Minor-Major 7th
        "dim7": [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.d7],
        // Diminished 7th (º7)
        "m7b5": [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.m7],
        // Half-diminished 7th (ø7)
        // --- Ninth Chords ---
        "9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
        // Dominant 9th
        "maj9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9],
        // Major 9th
        "M9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9],
        // Alias for Major 9th
        "m9": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
        // Minor 9th
        "min9": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
        // Alias for Minor 9th
        "m(maj9)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9],
        // Minor-Major 9th
        "mM9": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9],
        // Alias for Minor-Major 9th
        // --- Eleventh Chords ---
        // Note: Dominant 11 chords often omit the 3rd [P1, P5, m7, M9, P11]
        // Note: Major 11 chords often omit 3rd or 5th [P1, P5, M7, M9, P11] or [P1, M7, M9, P11]
        "11": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
        // Dominant 11th (full theory)
        "maj11": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11],
        // Major 11th (full theory)
        "M11": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11],
        // Alias Major 11th
        "m11": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
        // Minor 11th
        "min11": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
        // Alias Minor 11th
        "m(maj11)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11],
        // Minor-Major 11th
        "mM11": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11],
        // Alias Minor-Major 11th
        // --- Thirteenth Chords ---
        // Note: 13 chords often omit the 11th and sometimes the 5th.
        "13": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
        // Dominant 13th (omits 11th)
        "maj13": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13],
        // Major 13th (omits 11th)
        "M13": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13],
        // Alias Major 13th
        "m13": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
        // Minor 13th (omits 11th)
        "min13": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
        // Alias Minor 13th
        "m(maj13)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13],
        // Minor-Major 13th
        "mM13": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13],
        // Alias Minor-Major 13th
        // --- Altered/Extended Dominants & Others ---
        "7b5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7],
        "7#5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7],
        // Dominant 7th Augmented 5th
        "7aug": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7],
        // Alias for 7#5
        "7b9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.m9],
        "7#9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A9],
        "7(#11)": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A4],
        // Often omits 5th: [P1, M3, m7, A4/A11]
        "9b5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7, INTERVALS.M9],
        "9#5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7, INTERVALS.M9],
        "13b9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.m9, INTERVALS.M13],
        "13#9": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A9, INTERVALS.M13],
        "13(#11)": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.A4, INTERVALS.M13],
        // Original
        "7b9b5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7, INTERVALS.m9],
        "7b9#5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7, INTERVALS.m9],
        "7#9b5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7, INTERVALS.A9],
        "7#9#5": [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7, INTERVALS.A9],
        "7alt": [INTERVALS.P1, INTERVALS.M3, INTERVALS.m7, INTERVALS.m9, INTERVALS.A5],
        // Common Altered Dominant voicing (Root, 3, b7, b9, #5) - can vary!
        // --- Altered/Extended Major/Minor & Others ---
        "maj7(#11)": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.A4],
        // Major 7 sharp 11
        "M7#11": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.A4],
        // Alias
        "maj9(#11)": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.A4],
        // Major 9 sharp 11
        "M9#11": [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.A4],
        // Alias
        "m7(#11)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A4],
        // Minor 7 sharp 11
        "m9(#11)": [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.A4],
        // Minor 9 sharp 11
        // --- Suspended Variants ---
        "7sus4": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7],
        "7sus": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7],
        // Alias
        "9sus4": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
        "9sus": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
        // Alias
        "13sus4": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
        // Original
        "13sus": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
        // Alias
        "maj7sus4": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.M7],
        // Major 7 sus 4
        "M7sus": [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.M7]
        // Alias
      };
      TPQN = 128;
      OCTAVE_ADJUSTMENT_THRESHOLD = 6;
      MidiGenerator = class {
        normalizeNoteName(note) {
          const name = note.toUpperCase();
          switch (name) {
            // Flats are converted to sharps here!
            case "DB":
              return "C#";
            case "EB":
              return "D#";
            case "FB":
              return "E";
            // Special case
            case "GB":
              return "F#";
            case "AB":
              return "G#";
            case "BB":
              return "A#";
            // Sharps that wrap around
            case "E#":
              return "F";
            case "B#":
              return "C";
            default:
              return name;
          }
        }
        getNoteIndex(note) {
          const normalizedNote = this.normalizeNoteName(note);
          const index = NOTES.indexOf(normalizedNote);
          if (index === -1) {
            const reNormalized = this.normalizeNoteName(normalizedNote);
            const reIndex = NOTES.indexOf(reNormalized);
            if (reIndex === -1) {
              throw new Error(`Invalid note name: ${note} -> ${normalizedNote} -> ${reNormalized}`);
            }
            return reIndex;
          }
          return index;
        }
        getMidiNote(noteName, octave) {
          const noteIndex = this.getNoteIndex(noteName);
          const midiVal = 12 * (octave + 1) + noteIndex;
          if (midiVal < 0 || midiVal > 127) {
            console.warn(`Calculated MIDI note ${midiVal} for ${noteName}${octave} is outside the standard 0-127 range.`);
            return midiVal;
          }
          return midiVal;
        }
        /**
         * Converts a duration input string (beats, letter codes, or T-codes) to MIDI ticks.
         * @param durationInput - The duration string (e.g., "0.5", "1", "q", "8", "T128").
         *                        If undefined or empty, defaults to a quarter note.
         * @returns The duration in MIDI ticks.
         */
        getDurationTicks(durationInput) {
          if (!durationInput || durationInput.trim() === "") {
            return TPQN;
          }
          const input = durationInput.trim();
          const numericBeatValue = parseFloat(input);
          if (!isNaN(numericBeatValue) && numericBeatValue > 0) {
            return TPQN * numericBeatValue;
          }
          switch (input.toLowerCase()) {
            case "w":
            case "1":
              return TPQN * 4;
            // Whole note (4 beats)
            case "h":
            case "2":
              return TPQN * 2;
            // Half note (2 beats)
            case "dh":
            case "d2":
              return TPQN * 3;
            // Dotted half (3 beats)
            case "q":
            case "4":
              return TPQN;
            // Quarter note (1 beat)
            case "dq":
            case "d4":
              return TPQN * 1.5;
            // Dotted quarter (1.5 beats)
            case "e":
            case "8":
              return TPQN / 2;
            // Eighth note (0.5 beats)
            case "de":
            case "d8":
              return TPQN * 0.75;
            // Dotted eighth (0.75 beats)
            case "s":
            case "16":
              return TPQN / 4;
            // Sixteenth note (0.25 beats)
            default:
              if (/^t\d+$/i.test(input)) {
                return parseInt(input.substring(1), 10);
              }
              console.warn(`Unknown duration: "${input}". Defaulting to quarter note (${TPQN} ticks).`);
              return TPQN;
          }
        }
        /**
         * Generates all possible inversions for a given set of root-position chord notes.
         * @param rootPositionNotes - Array of MIDI notes in root position, sorted low to high.
         * @returns An array of voicings (each an array of MIDI notes), starting with root position.
         */
        generateInversions(rootPositionNotes) {
          if (rootPositionNotes.length <= 1) {
            return [rootPositionNotes];
          }
          const allInversions = [];
          let currentVoicing = [...rootPositionNotes];
          for (let i = 0; i < rootPositionNotes.length; i++) {
            currentVoicing.sort((a, b) => a - b);
            allInversions.push([...currentVoicing]);
            if (i < rootPositionNotes.length - 1) {
              const lowestNote = currentVoicing.shift();
              if (lowestNote !== void 0) {
                currentVoicing.push(lowestNote + 12);
              }
            }
          }
          return allInversions;
        }
        /**
         * Calculates a distance metric between two chord voicings to estimate smoothness.
         * A lower score means a smoother transition.
         * This simple version sums the absolute MIDI pitch differences of corresponding notes.
         * It penalizes differences in the number of notes.
         * @param voicing1 - First voicing (array of MIDI notes, sorted).
         * @param voicing2 - Second voicing (array of MIDI notes, sorted).
         * @returns A numeric score representing the distance.
         */
        calculateVoicingDistance(voicing1, voicing2) {
          const sorted1 = [...voicing1].sort((a, b) => a - b);
          const sorted2 = [...voicing2].sort((a, b) => a - b);
          let totalDistance = 0;
          const minLength = Math.min(sorted1.length, sorted2.length);
          const maxLength = Math.max(sorted1.length, sorted2.length);
          for (let i = 0; i < minLength; i++) {
            totalDistance += Math.abs(sorted1[i] - sorted2[i]);
          }
          const noteCountDifference = maxLength - minLength;
          totalDistance += noteCountDifference * 6;
          return totalDistance;
        }
        /**
         * Adjusts chord voicings to be closer to the target octave.
         * @param voicings - Array of chord voicings (arrays of MIDI notes).
         * @param baseOctave - The desired base octave (e.g., 3, 4).
         * @returns A new array with adjusted voicings.
         */
        adjustVoicingsToTargetOctave(voicings, baseOctave) {
          if (!voicings || voicings.length === 0) {
            return [];
          }
          const targetCenterPitch = this.getMidiNote("C", baseOctave);
          return voicings.map((voicing) => {
            if (!voicing || voicing.length === 0) {
              return [];
            }
            const sum = voicing.reduce((acc, note) => acc + note, 0);
            const averagePitch = sum / voicing.length;
            const difference = averagePitch - targetCenterPitch;
            if (Math.abs(difference) > OCTAVE_ADJUSTMENT_THRESHOLD) {
              const octaveShift = Math.round(difference / 12);
              if (octaveShift !== 0) {
                const semitoneShift = octaveShift * -12;
                const adjustedVoicing = voicing.map((note) => note + semitoneShift);
                const minNote = Math.min(...adjustedVoicing);
                const maxNote = Math.max(...adjustedVoicing);
                if (minNote >= 0 && maxNote <= 127) {
                  return adjustedVoicing.sort((a, b) => a - b);
                } else {
                  return voicing.sort((a, b) => a - b);
                }
              }
            }
            return voicing.sort((a, b) => a - b);
          });
        }
        /**
         * Calculates the appropriate bass note MIDI value for a given chord, prioritizing smooth transitions
         * and ensuring it's distinct from the main chord voicing when necessary.
         * @param chordData - The data for the current chord.
         * @param baseOctave - The target base octave for the *chords*.
         * @param inversionType - The type of inversion used for the chord voicing.
         * @param previousBassNote - The MIDI value of the previous bass note, if available.
         * @param outputType - The requested output type.
         * @param chordVoicing - The actual MIDI notes of the chord's adjusted voicing.
         * @returns The MIDI note number for the bass note, or null if none could be determined.
         */
        calculateBassNote(chordData, baseOctave, inversionType, previousBassNote, outputType, chordVoicing) {
          if (!chordData.isValid || !chordData.rootNoteName) {
            return null;
          }
          if (inversionType === "smooth" && previousBassNote !== null) {
            const potentialBassNotes = [];
            const prevOctave = Math.floor((previousBassNote - 12) / 12);
            for (let octave = prevOctave - 1; octave <= prevOctave + 1; octave++) {
              const bassNote = this.getMidiNote(chordData.rootNoteName, octave);
              if (bassNote >= 0 && bassNote <= 127) {
                potentialBassNotes.push(bassNote);
              }
            }
            if (potentialBassNotes.length > 0) {
              const chosenBassNote2 = potentialBassNotes.reduce(
                (closest, note) => Math.abs(note - previousBassNote) < Math.abs(closest - previousBassNote) ? note : closest
              );
              if (chosenBassNote2 >= 0 && chosenBassNote2 <= 127) {
                return chosenBassNote2;
              }
            }
          }
          const defaultBassOctave = baseOctave - 1;
          let chosenBassNote = this.getMidiNote(chordData.rootNoteName, defaultBassOctave);
          if (chordVoicing.length > 0 && chordVoicing.includes(chosenBassNote)) {
            const lowerBassNote = this.getMidiNote(chordData.rootNoteName, defaultBassOctave - 1);
            if (lowerBassNote >= 0 && lowerBassNote <= 127 && lowerBassNote !== chosenBassNote) {
              chosenBassNote = lowerBassNote;
            } else {
            }
          }
          if (chosenBassNote < 0 || chosenBassNote > 127) {
            console.warn(`Calculated bass note ${chosenBassNote} for "${chordData.symbol}" is out of range. Trying higher octave.`);
            const higherBassNote = this.getMidiNote(chordData.rootNoteName, defaultBassOctave + 1);
            if (higherBassNote >= 0 && higherBassNote <= 127 && !chordVoicing.includes(higherBassNote)) {
              return higherBassNote;
            }
            console.error(`Could not determine a valid bass note for "${chordData.symbol}".`);
            return null;
          }
          return chosenBassNote;
        }
        /**
         * Generates MIDI data and note array from provided options.
         * @param options - The settings for MIDI generation.
         * @returns Object containing notesForPianoRoll, midiBlob, and finalFileName, or throws an error.
         */
        generate(options) {
          const {
            progressionString,
            outputFileName,
            outputType,
            inversionType,
            baseOctave,
            // chordDurationStr, // No longer used globally
            tempo,
            velocity
          } = options;
          if (!progressionString || progressionString.trim() === "") {
            throw new Error("Chord progression cannot be empty.");
          }
          let finalFileName;
          if (outputFileName) {
            finalFileName = outputFileName.endsWith(".mid") ? outputFileName : `${outputFileName}.mid`;
          } else {
            const sanitizedProgressionString = progressionString.replace(/\s+/g, "_").replace(/:/g, "-");
            finalFileName = `${sanitizedProgressionString}_${String(outputType)}_${String(inversionType)}.mid`;
          }
          const chordEntries = progressionString.trim().split(/\s+/);
          const chordRegex = /^([A-G][#b]?)(.*)$/;
          const generatedChords = [];
          let currentTick = 0;
          let previousChordVoicing = null;
          let previousBassNote = null;
          for (const entry of chordEntries) {
            if (!entry) continue;
            const parts = entry.split(":");
            const chordSymbol = parts[0];
            const durationString = parts.length > 1 ? parts[1] : void 0;
            const currentChordDurationTicks = this.getDurationTicks(durationString);
            const match = chordSymbol.match(chordRegex);
            let chordData = {
              symbol: chordSymbol,
              startTimeTicks: currentTick,
              durationTicks: currentChordDurationTicks,
              initialVoicing: [],
              adjustedVoicing: [],
              rootNoteName: "",
              isValid: false,
              calculatedBassNote: null
              // Initialize bass note
            };
            if (!match) {
              console.warn(`Could not parse chord symbol: "${chordSymbol}" in entry "${entry}". Skipping.`);
              generatedChords.push(chordData);
              currentTick += currentChordDurationTicks;
              previousChordVoicing = null;
              continue;
            }
            const rootNoteName = match[1];
            let qualityAndExtensions = match[2];
            chordData.rootNoteName = rootNoteName;
            try {
              const rootMidi = this.getMidiNote(rootNoteName, baseOctave);
              let formulaIntervals = CHORD_FORMULAS[qualityAndExtensions];
              if (formulaIntervals === void 0) {
                if (qualityAndExtensions === "") {
                  formulaIntervals = CHORD_FORMULAS["maj"];
                  qualityAndExtensions = "maj";
                } else {
                  console.warn(`Chord quality "${qualityAndExtensions}" not found for "${chordSymbol}". Defaulting to major triad.`);
                  formulaIntervals = CHORD_FORMULAS["maj"];
                }
              }
              let rootPositionNotes = formulaIntervals.map((intervalSemitones) => rootMidi + intervalSemitones).sort((a, b) => a - b);
              let currentChordVoicing = [...rootPositionNotes];
              if (inversionType === "first" && currentChordVoicing.length > 1) {
                const lowestNote = currentChordVoicing.shift();
                if (lowestNote !== void 0) {
                  currentChordVoicing.push(lowestNote + 12);
                }
                currentChordVoicing.sort((a, b) => a - b);
              } else if (inversionType === "smooth") {
                if (!previousChordVoicing && currentChordVoicing.length > 1) {
                  currentChordVoicing = this.adjustVoicingsToTargetOctave([currentChordVoicing], baseOctave)[0];
                } else if (previousChordVoicing && currentChordVoicing.length > 1) {
                  const possibleInversions = this.generateInversions(rootPositionNotes);
                  let bestVoicing = currentChordVoicing;
                  let minDistance = Infinity;
                  const targetPreviousVoicing = this.adjustVoicingsToTargetOctave([previousChordVoicing], baseOctave)[0];
                  for (const inversion of possibleInversions) {
                    const adjustedInversion = this.adjustVoicingsToTargetOctave([inversion], baseOctave)[0];
                    const distance = this.calculateVoicingDistance(targetPreviousVoicing, adjustedInversion);
                    if (distance < minDistance) {
                      minDistance = distance;
                      bestVoicing = adjustedInversion;
                    }
                  }
                  currentChordVoicing = bestVoicing;
                } else {
                  currentChordVoicing = this.adjustVoicingsToTargetOctave([currentChordVoicing], baseOctave)[0];
                }
              } else if (inversionType === "pianist") {
                const root = currentChordVoicing[0];
                const topVoices = currentChordVoicing.slice(1).map((n) => n - 12);
                const SPREAD_BASE = 12;
                if (previousChordVoicing && topVoices.length > 1) {
                  const possibleVoicings = this.generateInversions(topVoices);
                  let bestTopVoicing = topVoices;
                  let minDistance = Infinity;
                  for (const inversion of possibleVoicings) {
                    const spreadInversion = inversion.map((note, i) => note + SPREAD_BASE + i * 2);
                    const testVoicing = [root, ...spreadInversion];
                    const distance = this.calculateVoicingDistance(previousChordVoicing, testVoicing);
                    if (distance < minDistance) {
                      minDistance = distance;
                      bestTopVoicing = spreadInversion;
                    }
                  }
                  currentChordVoicing = [root, ...bestTopVoicing].sort((a, b) => a - b);
                } else {
                  const spreadTop = topVoices.map((note, i) => note + SPREAD_BASE + i * 2);
                  currentChordVoicing = [root, ...spreadTop].sort((a, b) => a - b);
                }
              } else if (inversionType === "open") {
                if (currentChordVoicing.length > 2) {
                  currentChordVoicing[1] -= 12;
                  currentChordVoicing.sort((a, b) => a - b);
                }
              } else if (inversionType === "spread") {
                const root = currentChordVoicing[0];
                const spreadNotes = currentChordVoicing.slice(1).map((note, i) => note + 12 * (i % 2));
                currentChordVoicing = [root, ...spreadNotes].sort((a, b) => a - b);
              } else if (inversionType === "cocktail") {
                const root = currentChordVoicing[0];
                const seventh = currentChordVoicing.length > 3 ? currentChordVoicing[3] : currentChordVoicing[1];
                const melody = currentChordVoicing[currentChordVoicing.length - 1];
                currentChordVoicing = [root, seventh, melody].sort((a, b) => a - b);
              }
              chordData.initialVoicing = [...currentChordVoicing];
              chordData.isValid = true;
              previousChordVoicing = [...currentChordVoicing];
            } catch (error) {
              console.error(`Error processing chord "${chordSymbol}" in entry "${entry}": ${error.message}.`);
              previousChordVoicing = null;
            }
            generatedChords.push(chordData);
            currentTick += currentChordDurationTicks;
          }
          let finalVoicings;
          if (inversionType === "none" || inversionType === "first") {
            const initialVoicings = generatedChords.map((cd) => cd.initialVoicing);
            finalVoicings = this.adjustVoicingsToTargetOctave(initialVoicings, baseOctave);
          } else {
            finalVoicings = generatedChords.map((cd) => cd.initialVoicing);
          }
          generatedChords.forEach((cd, index) => {
            cd.adjustedVoicing = (finalVoicings[index] || []).sort((a, b) => a - b);
            if (cd.isValid) {
              cd.calculatedBassNote = this.calculateBassNote(
                cd,
                baseOctave,
                inversionType,
                previousBassNote,
                outputType,
                cd.adjustedVoicing
                // <-- Pass the adjusted voicing here
              );
              previousBassNote = cd.calculatedBassNote;
            }
          });
          const track = new import_midi_writer_js.default.Track();
          track.setTempo(tempo);
          track.setTimeSignature(4, 4, 24, 8);
          const notesForPianoRoll = [];
          for (const chordData of generatedChords) {
            if (!chordData.isValid) {
              track.addEvent(new import_midi_writer_js.default.NoteEvent({ pitch: [], wait: "T" + chordData.durationTicks, duration: "T0", velocity: 0 }));
              continue;
            }
            let eventMidiNotes = [];
            switch (outputType) {
              case "chordsOnly":
                eventMidiNotes = [...chordData.adjustedVoicing];
                break;
              case "chordsAndBass":
                eventMidiNotes = [...chordData.adjustedVoicing];
                if (chordData.calculatedBassNote !== null && !eventMidiNotes.includes(chordData.calculatedBassNote)) {
                  eventMidiNotes.push(chordData.calculatedBassNote);
                }
                break;
              case "bassOnly":
                if (chordData.calculatedBassNote !== null) {
                  eventMidiNotes = [chordData.calculatedBassNote];
                } else {
                  eventMidiNotes = [];
                  console.warn(`No valid bass note could be determined for "${chordData.symbol}". Adding rest.`);
                }
                break;
            }
            eventMidiNotes = eventMidiNotes.filter((note) => note >= 0 && note <= 127).sort((a, b) => a - b);
            eventMidiNotes = [...new Set(eventMidiNotes)];
            if (eventMidiNotes.length > 0) {
              eventMidiNotes.forEach((midiNote) => {
                notesForPianoRoll.push({
                  midiNote,
                  startTimeTicks: chordData.startTimeTicks,
                  durationTicks: chordData.durationTicks,
                  velocity
                });
              });
              track.addEvent(new import_midi_writer_js.default.NoteEvent({
                pitch: eventMidiNotes,
                duration: "T" + chordData.durationTicks,
                velocity
              }));
            } else {
              if (outputType !== "bassOnly") {
                console.warn(`No valid MIDI notes remained for chord "${chordData.symbol}" after final filtering. Adding rest.`);
              }
              track.addEvent(new import_midi_writer_js.default.NoteEvent({ pitch: [], wait: "T" + chordData.durationTicks, duration: "T0", velocity: 0 }));
            }
          }
          const writer = new import_midi_writer_js.default.Writer([track]);
          const midiDataBytes = writer.buildFile();
          const midiBlob = new Blob([midiDataBytes], { type: "audio/midi" });
          return { notesForPianoRoll, midiBlob, finalFileName, chordDetails: generatedChords };
        }
      };
    }
  });

  // SynthChordPlayer.ts
  var SynthChordPlayer;
  var init_SynthChordPlayer = __esm({
    "SynthChordPlayer.ts"() {
      "use strict";
      SynthChordPlayer = class {
        // Tracks currently playing/scheduled notes
        /**
         * Initializes the SynthChordPlayer.
         * @param initialVolume - The initial master volume (0.0 to 1.0).
         */
        constructor(initialVolume = 0.5) {
          this.audioContext = null;
          this.mainGainNode = null;
          this.activeNotes = /* @__PURE__ */ new Set();
          try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.mainGainNode = this.audioContext.createGain();
            const clampedVolume = Math.max(0, Math.min(1, initialVolume));
            this.mainGainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
            this.mainGainNode.connect(this.audioContext.destination);
          } catch (e) {
            console.error("Web Audio API is not supported or could not be initialized.", e);
          }
        }
        /**
         * Resumes the AudioContext if it's in a suspended state.
         * This MUST be called in response to a user gesture (e.g., button click).
         */
        ensureContextResumed() {
          if (this.audioContext && this.audioContext.state === "suspended") {
            console.log("Resuming AudioContext...");
            return this.audioContext.resume().then(() => {
              console.log("AudioContext resumed successfully.");
            }).catch((e) => console.error("Error resuming AudioContext:", e));
          }
          return Promise.resolve();
        }
        /**
         * Converts a MIDI note number to its corresponding frequency in Hertz.
         * @param midiNote - The MIDI note number (e.g., 60 for Middle C).
         * @returns The frequency in Hz.
         */
        midiNoteToFrequency(midiNote) {
          return 440 * Math.pow(2, (midiNote - 69) / 12);
        }
        /**
         * Plays a chord consisting of multiple MIDI notes.
         * @param midiNotes - An array of MIDI note numbers for the chord.
         * @param durationSeconds - How long the chord should play in seconds.
         */
        playChord(midiNotes, durationSeconds = 1.5) {
          if (!this.audioContext || !this.mainGainNode) {
            console.error("AudioContext not available. Cannot play chord.");
            return;
          }
          const now = this.audioContext.currentTime;
          const detuneAmount = 6;
          midiNotes.forEach((note) => {
            const baseFrequency = this.midiNoteToFrequency(note);
            const osc1 = this.audioContext.createOscillator();
            osc1.type = "sawtooth";
            osc1.frequency.setValueAtTime(baseFrequency, now);
            osc1.detune.setValueAtTime(-detuneAmount, now);
            const osc2 = this.audioContext.createOscillator();
            osc2.type = "sawtooth";
            osc2.frequency.setValueAtTime(baseFrequency, now);
            osc2.detune.setValueAtTime(detuneAmount, now);
            const noteGain = this.audioContext.createGain();
            const initialGain = 0.4;
            noteGain.gain.setValueAtTime(initialGain, now);
            osc1.connect(noteGain);
            osc2.connect(noteGain);
            noteGain.connect(this.mainGainNode);
            const stopTime = now + durationSeconds;
            const activeNote = { midiNote: note, velocity: initialGain, duration: durationSeconds, oscillators: [osc1, osc2], noteGain, stopTime };
            this.activeNotes.add(activeNote);
            osc1.onended = () => {
              if (this.activeNotes.has(activeNote)) {
                try {
                  osc1.disconnect();
                  osc2.disconnect();
                  noteGain.disconnect();
                } catch (e) {
                }
                this.activeNotes.delete(activeNote);
              }
            };
            osc1.start(now);
            osc2.start(now);
            osc1.stop(stopTime);
            osc2.stop(stopTime);
          });
        }
        /**
         * Starts playing a chord indefinitely until stopped manually.
         * @param midiNotes - An array of MIDI note numbers for the chord.
         */
        startChord(midiNotes) {
          if (!this.audioContext || !this.mainGainNode) {
            console.error("AudioContext not available. Cannot play chord.");
            return [];
          }
          const now = this.audioContext.currentTime;
          const detuneAmount = 6;
          const activeNotes = [];
          midiNotes.forEach((note) => {
            const baseFrequency = this.midiNoteToFrequency(note);
            const osc1 = this.audioContext.createOscillator();
            osc1.type = "sawtooth";
            osc1.frequency.setValueAtTime(baseFrequency, now);
            osc1.detune.setValueAtTime(-detuneAmount, now);
            const osc2 = this.audioContext.createOscillator();
            osc2.type = "sawtooth";
            osc2.frequency.setValueAtTime(baseFrequency, now);
            osc2.detune.setValueAtTime(detuneAmount, now);
            const noteGain = this.audioContext.createGain();
            const initialGain = 0.4;
            noteGain.gain.setValueAtTime(initialGain, now);
            osc1.connect(noteGain);
            osc2.connect(noteGain);
            noteGain.connect(this.mainGainNode);
            const activeNote = { midiNote: note, velocity: initialGain, duration: Infinity, oscillators: [osc1, osc2], noteGain, stopTime: Infinity };
            this.activeNotes.add(activeNote);
            activeNotes.push(activeNote);
            osc1.start(now);
            osc2.start(now);
          });
          return activeNotes;
        }
        /**
         * Stops specific active notes or all notes if none are specified.
         * @param notesToStop - An array of ActiveNote objects to stop. Stops all if not provided.
         */
        stopNotes(notesToStop) {
          if (!this.audioContext || this.activeNotes.size === 0) {
            return;
          }
          const now = this.audioContext.currentTime;
          const fadeOutDuration = 0.05;
          const notes = notesToStop || Array.from(this.activeNotes);
          notes.forEach((activeNote) => {
            activeNote.noteGain.gain.cancelScheduledValues(now);
            activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now);
            activeNote.noteGain.gain.exponentialRampToValueAtTime(1e-4, now + fadeOutDuration);
            const manualStopTime = now + fadeOutDuration + 0.01;
            activeNote.oscillators.forEach((osc) => {
              try {
                osc.stop(manualStopTime);
              } catch (e) {
              }
            });
            setTimeout(() => {
              if (this.activeNotes.has(activeNote)) {
                try {
                  activeNote.oscillators.forEach((osc) => osc.disconnect());
                  activeNote.noteGain.disconnect();
                } catch (e) {
                }
                this.activeNotes.delete(activeNote);
              }
            }, fadeOutDuration * 1e3 + 10);
          });
        }
        /**
         * Immediately stops all currently playing or scheduled sounds managed by this player.
         * Applies a very short fade-out to prevent clicks.
         */
        stopAll() {
          if (!this.audioContext || this.activeNotes.size === 0) {
            return;
          }
          const now = this.audioContext.currentTime;
          const fadeOutDuration = 0.05;
          console.log(`Stopping ${this.activeNotes.size} active notes...`);
          this.activeNotes.forEach((activeNote) => {
            if (now < activeNote.stopTime) {
              activeNote.noteGain.gain.cancelScheduledValues(now);
              activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now);
              activeNote.noteGain.gain.exponentialRampToValueAtTime(1e-4, now + fadeOutDuration);
              const manualStopTime = now + fadeOutDuration + 0.01;
              activeNote.oscillators.forEach((osc) => {
                try {
                  osc.stop(manualStopTime);
                } catch (e) {
                }
              });
            } else {
              setTimeout(() => {
                if (this.activeNotes.has(activeNote)) {
                  try {
                    activeNote.oscillators.forEach((osc) => osc.disconnect());
                    activeNote.noteGain.disconnect();
                  } catch (e) {
                  }
                  this.activeNotes.delete(activeNote);
                }
              }, 50);
            }
          });
          this.activeNotes.clear();
          console.log("Stop command issued for all active notes.");
        }
        /**
         * Sets the master volume.
         * @param volume - The desired volume level (0.0 to 1.0).
         */
        setVolume(volume) {
          if (this.mainGainNode && this.audioContext) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            this.mainGainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
          }
        }
        /**
        * Gets the current master volume.
        * @returns The current volume level (0.0 to 1.0).
        */
        getVolume() {
          if (this.mainGainNode) {
            return this.mainGainNode.gain.value;
          }
          return 0;
        }
      };
    }
  });

  // PianoRollDrawer.ts
  var PianoRollDrawer;
  var init_PianoRollDrawer = __esm({
    "PianoRollDrawer.ts"() {
      "use strict";
      init_SynthChordPlayer();
      PianoRollDrawer = class {
        constructor(canvas, initialOptions = {}) {
          // Use Required to ensure all options have defaults
          this.lastDrawnNotes = [];
          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) {
            throw new Error("Could not get 2D context for canvas");
          }
          this.canvas = canvas;
          this.ctx = ctx;
          this.options = {
            noteColor: initialOptions.noteColor ?? "#2563eb",
            // Default blue notes
            backgroundColor: initialOptions.backgroundColor ?? "#f9fafb",
            // Default light gray background
            gridColor: initialOptions.gridColor ?? "#e5e7eb"
            // Default lighter gray grid
          };
          this.resize();
          this.synthPlayer = new SynthChordPlayer();
        }
        /**
         * Resizes the canvas drawing buffer to match its display size and DPR.
         * Also redraws the last drawn notes.
         */
        resize() {
          const dpr = window.devicePixelRatio || 1;
          const displayWidth = this.canvas.clientWidth;
          const displayHeight = this.canvas.clientHeight;
          if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
          this.draw(this.lastDrawnNotes);
        }
        /**
         * Clears the canvas and draws the provided notes.
         * @param notesData - Array of notes to draw.
         */
        draw(notesData) {
          this.lastDrawnNotes = notesData;
          const { noteColor, backgroundColor, gridColor } = this.options;
          const dpr = window.devicePixelRatio || 1;
          const canvasWidth = this.canvas.clientWidth;
          const canvasHeight = this.canvas.clientHeight;
          this.ctx.save();
          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
          this.ctx.fillStyle = backgroundColor;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.restore();
          if (notesData.length === 0) {
            this.drawEmptyMessage("No notes to display");
            return;
          }
          let minMidi = 127;
          let maxMidi = 0;
          let maxTimeTicks = 0;
          notesData.forEach((note) => {
            minMidi = Math.min(minMidi, note.midiNote);
            maxMidi = Math.max(maxMidi, note.midiNote);
            maxTimeTicks = Math.max(maxTimeTicks, note.startTimeTicks + note.durationTicks);
          });
          minMidi = Math.max(0, minMidi - 2);
          maxMidi = Math.min(127, maxMidi + 2);
          const midiRange = maxMidi - minMidi + 1;
          if (maxTimeTicks > 0) {
            maxTimeTicks += maxTimeTicks * 0.02;
          } else {
            maxTimeTicks = 1;
          }
          const noteHeight = canvasHeight / midiRange;
          const timeScale = canvasWidth / maxTimeTicks;
          this.ctx.strokeStyle = gridColor;
          this.ctx.lineWidth = 0.5;
          for (let midi = minMidi; midi <= maxMidi; midi++) {
            if (midi % 12 === 0) {
              const y = canvasHeight - (midi - minMidi + 0.5) * noteHeight;
              this.ctx.beginPath();
              this.ctx.moveTo(0, y);
              this.ctx.lineTo(canvasWidth, y);
              this.ctx.stroke();
            }
          }
          this.ctx.fillStyle = noteColor;
          notesData.forEach((note) => {
            const x = note.startTimeTicks * timeScale;
            const y = canvasHeight - (note.midiNote - minMidi + 1) * noteHeight;
            const width = note.durationTicks * timeScale;
            const height = noteHeight;
            this.ctx.fillRect(
              x,
              y,
              Math.max(1 / dpr, width - 1 / dpr),
              // Small inset for visual separation
              Math.max(1 / dpr, height - 1 / dpr)
            );
          });
        }
        /** Draws a message centered on the canvas. */
        drawEmptyMessage(message, color = "#6b7280") {
          const canvasWidth = this.canvas.clientWidth;
          const canvasHeight = this.canvas.clientHeight;
          this.ctx.save();
          this.ctx.fillStyle = color;
          this.ctx.font = "14px sans-serif";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(message, canvasWidth / 2, canvasHeight / 2);
          this.ctx.restore();
        }
        /** Draws an error message centered on the canvas. */
        drawErrorMessage(message) {
          this.lastDrawnNotes = [];
          const backgroundColor = this.options.backgroundColor;
          this.ctx.save();
          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
          this.ctx.fillStyle = backgroundColor;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.restore();
          this.drawEmptyMessage(message, "#ef4444");
        }
        renderChordButtons(chords, chordDetails) {
          const buttonContainer = document.getElementById("chordButtonContainer");
          if (!buttonContainer) {
            console.error("Chord button container not found!");
            return;
          }
          buttonContainer.innerHTML = "";
          const activeNotesMap = /* @__PURE__ */ new Map();
          chords.forEach((chord, index) => {
            const button = document.createElement("button");
            button.className = "btn btn-outline-primary m-1";
            button.textContent = chord;
            button.addEventListener("mousedown", () => {
              if (chordDetails && chordDetails[index]) {
                const midiNotes = chordDetails[index].adjustedVoicing;
                const activeNotes = this.synthPlayer.startChord(midiNotes);
                activeNotesMap.set(index, activeNotes);
              } else {
                console.warn(`No details available for chord at index ${index}`);
              }
            });
            button.addEventListener("mouseup", () => {
              const activeNotes = activeNotesMap.get(index);
              if (activeNotes) {
                this.synthPlayer.stopNotes(activeNotes);
                activeNotesMap.delete(index);
              }
            });
            button.addEventListener("mouseleave", () => {
              const activeNotes = activeNotesMap.get(index);
              if (activeNotes) {
                this.synthPlayer.stopNotes(activeNotes);
                activeNotesMap.delete(index);
              }
            });
            buttonContainer.appendChild(button);
          });
        }
      };
    }
  });

  // ChordInfoModal.ts
  var ChordInfoModal;
  var init_ChordInfoModal = __esm({
    "ChordInfoModal.ts"() {
      "use strict";
      init_MidiGenerator();
      ChordInfoModal = class {
        static generateModalHTML() {
          const chordEntries = Object.entries(CHORD_FORMULAS);
          let modalContent = '<div class="modal" id="chordInfoModal" tabindex="-1">';
          modalContent += '<div class="modal-dialog modal-lg modal-dialog-scrollable">';
          modalContent += '<div class="modal-content">';
          modalContent += '<div class="modal-header">';
          modalContent += '<h5 class="modal-title">Chord & Duration Information</h5>';
          modalContent += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>';
          modalContent += "</div>";
          modalContent += '<div class="modal-body">';
          modalContent += "<h5>Chord Durations</h5>";
          modalContent += "<p>Specify duration per chord using a colon (e.g., <code>C:1 G:0.5 Am:2</code>). If no duration is given, it defaults to 1 beat (a quarter note).</p>";
          modalContent += "<h6>Supported Duration Formats:</h6>";
          modalContent += '<ul class="list-unstyled">';
          modalContent += "<li><strong>Numeric Beats:</strong> Directly specify the number of beats. Examples:";
          modalContent += '<ul class="list-group list-group-flush mb-2">';
          modalContent += '<li class="list-group-item py-1"><code>0.25</code> (sixteenth note)</li>';
          modalContent += '<li class="list-group-item py-1"><code>0.5</code> (eighth note)</li>';
          modalContent += '<li class="list-group-item py-1"><code>0.75</code> (dotted eighth note)</li>';
          modalContent += '<li class="list-group-item py-1"><code>1</code> (quarter note - default)</li>';
          modalContent += '<li class="list-group-item py-1"><code>1.5</code> (dotted quarter note)</li>';
          modalContent += '<li class="list-group-item py-1"><code>2</code> (half note)</li>';
          modalContent += '<li class="list-group-item py-1"><code>3</code> (dotted half note)</li>';
          modalContent += '<li class="list-group-item py-1"><code>4</code> (whole note)</li>';
          modalContent += "</ul></li>";
          modalContent += "<li><strong>Letter Codes:</strong> Common musical notation codes.";
          modalContent += '<ul class="list-group list-group-flush mb-2">';
          modalContent += '<li class="list-group-item py-1"><code>s</code> or <code>16</code>: Sixteenth note (0.25 beats)</li>';
          modalContent += '<li class="list-group-item py-1"><code>e</code> or <code>8</code>: Eighth note (0.5 beats)</li>';
          modalContent += '<li class="list-group-item py-1"><code>de</code> or <code>d8</code>: Dotted Eighth (0.75 beats)</li>';
          modalContent += '<li class="list-group-item py-1"><code>q</code> or <code>4</code>: Quarter note (1 beat)</li>';
          modalContent += '<li class="list-group-item py-1"><code>dq</code> or <code>d4</code>: Dotted Quarter (1.5 beats)</li>';
          modalContent += '<li class="list-group-item py-1"><code>h</code> or <code>2</code>: Half note (2 beats)</li>';
          modalContent += '<li class="list-group-item py-1"><code>dh</code> or <code>d2</code>: Dotted Half (3 beats)</li>';
          modalContent += '<li class="list-group-item py-1"><code>w</code> or <code>1</code>: Whole note (4 beats)</li>';
          modalContent += "</ul></li>";
          modalContent += `<li><strong>Absolute Ticks (Advanced):</strong> For precise MIDI tick-based timing. Prepend with 'T'. (TPQN = ${TPQN} ticks per quarter note).`;
          modalContent += '<ul class="list-group list-group-flush mb-2">';
          modalContent += `<li class="list-group-item py-1"><code>T${TPQN / 4}</code> (sixteenth note)</li>`;
          modalContent += `<li class="list-group-item py-1"><code>T${TPQN / 2}</code> (eighth note)</li>`;
          modalContent += `<li class="list-group-item py-1"><code>T${TPQN}</code> (quarter note)</li>`;
          modalContent += `<li class="list-group-item py-1"><code>T${TPQN * 2}</code> (half note)</li>`;
          modalContent += `<li class="list-group-item py-1"><code>T${TPQN * 4}</code> (whole note)</li>`;
          modalContent += "</ul></li></ul>";
          modalContent += "<hr>";
          modalContent += "<h5>Known Chord Qualities</h5>";
          modalContent += "<p>The following chord qualities are recognized (case-insensitive). Chord symbols are generally <code>[RootNote][Quality]</code> (e.g., C, Cm, Cmaj7, Gsus, F#dim7). Root notes can be A-G, optionally followed by # (sharp) or b (flat).</p>";
          modalContent += '<ul class="list-group">';
          chordEntries.forEach(([chord, formula]) => {
            modalContent += `<li class="list-group-item"><strong>${chord || "Major"}:</strong> ${formula.join(", ")}</li>`;
          });
          modalContent += "</ul>";
          modalContent += "</div>";
          modalContent += '<div class="modal-footer">';
          modalContent += '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
          modalContent += "</div>";
          modalContent += "</div>";
          modalContent += "</div>";
          modalContent += "</div>";
          return modalContent;
        }
        static injectModalIntoDOM() {
          const modalHTML = this.generateModalHTML();
          const modalContainer = document.createElement("div");
          modalContainer.innerHTML = modalHTML;
          document.body.appendChild(modalContainer);
        }
      };
    }
  });

  // main.ts
  var require_main = __commonJS({
    "main.ts"() {
      init_MidiGenerator();
      init_PianoRollDrawer();
      init_SynthChordPlayer();
      init_ChordInfoModal();
      function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      function setupApp() {
        const form = document.getElementById("midiForm");
        const statusDiv = document.getElementById("status");
        const velocitySlider = document.getElementById("velocity");
        const velocityValueSpan = document.getElementById("velocityValue");
        const pianoRollCanvas = document.getElementById("pianoRollCanvas");
        const downloadMidiOnlyButton = document.getElementById("downloadMidiOnlyButton");
        const chordIndicator = document.getElementById("chordIndicator");
        if (!form || !statusDiv || !velocitySlider || !velocityValueSpan || !pianoRollCanvas || !downloadMidiOnlyButton) {
          console.error("One or more required HTML elements not found!");
          if (statusDiv) statusDiv.textContent = "Error: Could not initialize the application (missing elements).";
          return;
        }
        let pianoRollDrawer;
        try {
          pianoRollDrawer = new PianoRollDrawer(pianoRollCanvas);
        } catch (error) {
          console.error("Failed to initialize PianoRollDrawer:", error);
          if (statusDiv) {
            statusDiv.textContent = `Error: Canvas setup failed - ${error.message}`;
            statusDiv.classList.add("text-danger");
          }
          pianoRollCanvas.style.border = "2px solid red";
          return;
        }
        const midiGenerator = new MidiGenerator();
        const synthChordPlayer = new SynthChordPlayer();
        let lastGeneratedResult = null;
        let lastGeneratedNotes = [];
        let lastGeneratedMidiBlob = null;
        const resumeAudioContext = () => synthChordPlayer.ensureContextResumed();
        document.addEventListener("click", resumeAudioContext, { once: true });
        velocitySlider.addEventListener("input", (event) => {
          velocityValueSpan.textContent = event.target.value;
        });
        const updateChordIndicator = (chord) => {
          if (chordIndicator) {
            chordIndicator.textContent = `Playing: ${chord}`;
            chordIndicator.classList.add("text-primary");
            setTimeout(() => {
              chordIndicator.textContent = "";
              chordIndicator.classList.remove("text-primary");
            }, 2e3);
          }
        };
        const ALL_POSSIBLE_NOTE_NAMES_FOR_VALIDATION = [
          "C",
          "C#",
          "Db",
          "D",
          "D#",
          "Eb",
          "E",
          "Fb",
          // E flat is Eb, F flat is E
          "F",
          "F#",
          "Gb",
          "G",
          "G#",
          "Ab",
          "A",
          "A#",
          "Bb",
          "B",
          "Cb"
          // C flat is B
          // We don't strictly need E# or B# here as users rarely input them,
          // and MidiGenerator normalizes them anyway if they somehow get through.
        ];
        function generateValidChordPattern() {
          const notePattern = ALL_POSSIBLE_NOTE_NAMES_FOR_VALIDATION.join("|");
          const qualitiesPattern = Object.keys(CHORD_FORMULAS).filter((q) => q).map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|");
          return new RegExp(`^(${notePattern})(?:(${qualitiesPattern}))?$`, "i");
        }
        const VALID_DURATION_CODES = [
          "w",
          "1",
          "h",
          "2",
          "dh",
          "d2",
          "q",
          "4",
          "dq",
          "d4",
          "e",
          "8",
          "de",
          "d8",
          "s",
          "16"
        ];
        function validateChordProgression(progression) {
          const normalizedProgression = progression.replace(/\|/g, " ").replace(/->/g, " ").replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
          if (!normalizedProgression) {
            return "";
          }
          const chordEntries = normalizedProgression.split(/\s+/);
          const validChordSymbolPattern = generateValidChordPattern();
          const validatedEntries = [];
          for (const entry of chordEntries) {
            if (!entry) continue;
            const parts = entry.split(":");
            const chordSymbol = parts[0];
            const durationStr = parts.length > 1 ? parts[1] : void 0;
            if (!validChordSymbolPattern.test(chordSymbol)) {
              throw new Error(`Invalid chord symbol: "${chordSymbol}" in entry "${entry}". Use formats like C, Cm, G7.`);
            }
            if (durationStr !== void 0) {
              const numericDuration = parseFloat(durationStr);
              const isValidNumeric = !isNaN(numericDuration) && numericDuration > 0;
              const isKnownCode = VALID_DURATION_CODES.includes(durationStr.toLowerCase());
              const isTCode = /^t\d+$/i.test(durationStr);
              if (!isValidNumeric && !isKnownCode && !isTCode) {
                throw new Error(`Invalid duration: "${durationStr}" for chord "${chordSymbol}". Use beats (e.g., 0.5, 1), codes (e.g., q, 8, d4), or T-codes (e.g., T128).`);
              }
              validatedEntries.push(`${chordSymbol}:${durationStr}`);
            } else {
              validatedEntries.push(chordSymbol);
            }
          }
          return validatedEntries.join(" ");
        }
        const handleGeneration = (isDownloadOnly) => {
          const actionText = isDownloadOnly ? "Generating MIDI file" : "Generating preview and MIDI";
          statusDiv.textContent = `${actionText}...`;
          statusDiv.classList.remove("text-danger", "text-success");
          statusDiv.classList.add("text-muted");
          try {
            const formData = new FormData(form);
            const rawProgression = formData.get("progression");
            const validatedProgression = validateChordProgression(rawProgression);
            const options = {
              progressionString: validatedProgression,
              outputFileName: formData.get("outputFileName") || void 0,
              // Let generator handle default
              outputType: formData.get("outputType"),
              inversionType: formData.get("inversionType"),
              baseOctave: parseInt(formData.get("baseOctave"), 10),
              // chordDurationStr: formData.get('chordDuration') as string, // Removed
              tempo: parseInt(formData.get("tempo"), 10),
              velocity: parseInt(formData.get("velocity"), 10)
            };
            const generationResult = midiGenerator.generate(options);
            lastGeneratedResult = generationResult;
            lastGeneratedNotes = generationResult.notesForPianoRoll;
            const chordDetails = generationResult.chordDetails;
            console.log("Chord Details:", chordDetails);
            lastGeneratedMidiBlob = generationResult.midiBlob;
            const progressionChordSymbols = validatedProgression.split(" ").map((entry) => entry.split(":")[0]);
            pianoRollDrawer.renderChordButtons(progressionChordSymbols, chordDetails);
            if (isDownloadOnly) {
              triggerDownload(generationResult.midiBlob, generationResult.finalFileName);
              statusDiv.textContent = `MIDI file "${generationResult.finalFileName}" download initiated.`;
              statusDiv.classList.replace("text-muted", "text-success");
            } else {
              pianoRollDrawer.draw(generationResult.notesForPianoRoll);
              statusDiv.textContent = `Preview generated.`;
              statusDiv.classList.replace("text-muted", "text-success");
            }
          } catch (error) {
            console.error(`Error during MIDI generation (${actionText}):`, error);
            lastGeneratedResult = null;
            lastGeneratedNotes = [];
            lastGeneratedMidiBlob = null;
            statusDiv.textContent = `Error: ${error.message || "Failed to generate MIDI."}`;
            statusDiv.classList.replace("text-muted", "text-danger");
            pianoRollDrawer.drawErrorMessage("Error generating preview");
          }
        };
        pianoRollDrawer.renderChordButtons = (chords, chordDetails) => {
          const buttonContainer = document.getElementById("chordButtonContainer");
          if (!buttonContainer) {
            console.error("Chord button container not found!");
            return;
          }
          buttonContainer.innerHTML = "";
          const activeNotesMap = /* @__PURE__ */ new Map();
          chords.forEach((chord, index) => {
            const button = document.createElement("button");
            button.className = "btn btn-outline-primary m-1";
            button.textContent = chord;
            button.addEventListener("mousedown", () => {
              if (chordDetails && chordDetails[index]) {
                const midiNotes = chordDetails[index].adjustedVoicing;
                const activeNotes = synthChordPlayer.startChord(midiNotes);
                activeNotesMap.set(index, activeNotes);
              } else {
                console.warn(`No details available for chord at index ${index}`);
              }
            });
            button.addEventListener("touchstart", (event) => {
              event.preventDefault();
              if (chordDetails && chordDetails[index]) {
                const midiNotes = chordDetails[index].adjustedVoicing;
                const activeNotes = synthChordPlayer.startChord(midiNotes);
                activeNotesMap.set(index, activeNotes);
              } else {
                console.warn(`No details available for chord at index ${index}`);
              }
            });
            button.addEventListener("mouseup", () => {
              const activeNotes = activeNotesMap.get(index);
              if (activeNotes) {
                synthChordPlayer.stopNotes(activeNotes);
                activeNotesMap.delete(index);
              }
            });
            button.addEventListener("touchend", (event) => {
              event.preventDefault();
              const activeNotes = activeNotesMap.get(index);
              if (activeNotes) {
                synthChordPlayer.stopNotes(activeNotes);
                activeNotesMap.delete(index);
              }
            });
            button.addEventListener("mouseleave", () => {
              const activeNotes = activeNotesMap.get(index);
              if (activeNotes) {
                synthChordPlayer.stopNotes(activeNotes);
                activeNotesMap.delete(index);
              }
            });
            button.addEventListener("touchcancel", () => {
              const activeNotes = activeNotesMap.get(index);
              if (activeNotes) {
                synthChordPlayer.stopNotes(activeNotes);
                activeNotesMap.delete(index);
              }
            });
            buttonContainer.appendChild(button);
          });
        };
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          handleGeneration(false);
        });
        downloadMidiOnlyButton.addEventListener("click", (event) => {
          event.preventDefault();
          handleGeneration(true);
        });
        const formInputs = form.querySelectorAll("input, select, textarea");
        formInputs.forEach((input) => {
          input.addEventListener("change", () => {
            handleGeneration(false);
          });
        });
        let resizeTimeout;
        window.addEventListener("resize", () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = window.setTimeout(() => {
            pianoRollDrawer.resize();
          }, 100);
        });
        statusDiv.textContent = "Enter a progression and click generate.";
        pianoRollDrawer.draw([]);
        const helpButton = document.getElementById("helpButton");
        if (helpButton) {
          helpButton.addEventListener("click", () => {
            ChordInfoModal.injectModalIntoDOM();
            const modal = new window.bootstrap.Modal(document.getElementById("chordInfoModal"));
            modal.show();
          });
        }
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupApp);
      } else {
        setupApp();
      }
    }
  });
  require_main();
})();
//# sourceMappingURL=bundle.js.map
