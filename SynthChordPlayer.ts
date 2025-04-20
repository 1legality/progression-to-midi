/**
 * Represents an active note being played, holding references
 * to its oscillators and gain node for management (e.g., stopping).
 */
interface ActiveNote {
    oscillators: OscillatorNode[];
    noteGain: GainNode;
    // Store the intended stop time for potential cleanup checks
    stopTime: number;
}

/**
 * A simple synthesizer class using the Web Audio API to play chords
 * with two detuned sawtooth oscillators per note for a basic analog synth vibe.
 */
export class SynthChordPlayer {
    public audioContext: AudioContext | null = null;
    private mainGainNode: GainNode | null = null;
    private reverbGain: GainNode | null = null;
    private delayNodes: DelayNode[] = [];
    private activeNotes: Set<ActiveNote> = new Set(); // Tracks currently playing/scheduled notes

    /**
     * Initializes the SynthChordPlayer.
     * @param initialVolume - The initial master volume (0.0 to 1.0).
     */
    constructor(initialVolume: number = 0.5) {
        try {
            // Create the audio context and main gain node
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.mainGainNode = this.audioContext.createGain();
            // Clamp initial volume
            const clampedVolume = Math.max(0, Math.min(1, initialVolume));
            this.mainGainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
            this.mainGainNode.connect(this.audioContext.destination);

            // Create algorithmic reverb using feedback delay network
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.setValueAtTime(0.6, this.audioContext.currentTime); // Increase reverb intensity for a cave-like effect

            // Create multiple delay nodes for the reverb effect
            for (let i = 0; i < 4; i++) {
                const delay = this.audioContext.createDelay();
                delay.delayTime.setValueAtTime(0.3 + i * 0.15, this.audioContext.currentTime); // Longer delays for cave effect
                this.delayNodes.push(delay);
                const feedbackGain = this.audioContext.createGain();
                feedbackGain.gain.setValueAtTime(0.8, this.audioContext.currentTime); // Higher feedback for extended reverb tail
                delay.connect(feedbackGain);
                feedbackGain.connect(delay); // Feedback loop
                feedbackGain.connect(this.reverbGain);
            }

            // Connect the reverb gain to the main gain node
            this.reverbGain.connect(this.mainGainNode);
        } catch (e) {
            console.error("Web Audio API is not supported or could not be initialized.", e);
        }
    }

    /**
     * Resumes the AudioContext if it's in a suspended state.
     * This MUST be called in response to a user gesture (e.g., button click).
     */
    public ensureContextResumed(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log("Resuming AudioContext...");
            return this.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully.");
            }).catch(e => console.error("Error resuming AudioContext:", e));
        }
        return Promise.resolve(); // Context already running or not available
    }

    /**
     * Converts a MIDI note number to its corresponding frequency in Hertz.
     * @param midiNote - The MIDI note number (e.g., 60 for Middle C).
     * @returns The frequency in Hz.
     */
    private midiNoteToFrequency(midiNote: number): number {
        // Standard formula: A4 = 440Hz = MIDI note 69
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    /**
     * Plays a chord consisting of multiple MIDI notes.
     * @param midiNotes - An array of MIDI note numbers for the chord.
     * @param durationSeconds - How long the chord should play in seconds.
     * @param loop - Whether the chord should loop.
     */
    public playChord(midiNotes: number[], durationSeconds: number = 1.5, loop: boolean = false): void {
        if (!this.audioContext || !this.mainGainNode || !this.reverbGain) {
            console.error("AudioContext or reverb node not available. Cannot play chord.");
            return;
        }

        const now = this.audioContext.currentTime;
        const detuneAmount = 6; // Cents (adjust for desired thickness)

        midiNotes.forEach(note => {
            const baseFrequency = this.midiNoteToFrequency(note);

            // --- Oscillators ---
            const osc1 = this.audioContext!.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(baseFrequency, now);
            osc1.detune.setValueAtTime(-detuneAmount, now); // Detune down

            const osc2 = this.audioContext!.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(baseFrequency, now);
            osc2.detune.setValueAtTime(detuneAmount, now); // Detune up

            // --- Gain Node per Note (for envelope) ---
            const noteGain = this.audioContext!.createGain();
            const initialGain = 0.8; // Set volume to 50%
            const attackTime = 0.2; // Increase attack time for a smoother onset
            const sustainLevel = 0.4; // Set sustain level to 0.4
            const decayTime = 0.3; // Time to reach sustain level after attack

            noteGain.gain.setValueAtTime(0.0, now); // Start at 0 volume
            noteGain.gain.linearRampToValueAtTime(initialGain, now + attackTime); // Ramp up to initial gain over attack time
            noteGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime); // Ramp down to sustain level over decay time

            // --- Connections ---
            osc1.connect(noteGain);
            osc2.connect(noteGain);
            if (this.reverbGain) {
                noteGain.connect(this.reverbGain); // Connect note's gain to reverb network
            }

            // --- Tracking and Cleanup ---
            const stopTime = now + durationSeconds;
            const activeNote: ActiveNote = { oscillators: [osc1, osc2], noteGain, stopTime };
            this.activeNotes.add(activeNote);

            // Use 'onended' event for reliable cleanup after natural stop or manual stop
            osc1.onended = () => {
                if (this.activeNotes.has(activeNote)) {
                    try {
                        osc1.disconnect();
                        osc2.disconnect();
                        noteGain.disconnect();
                    } catch (e) { /* Ignore errors if already disconnected */ }
                    this.activeNotes.delete(activeNote);

                    // Restart the chord if looping is enabled
                    if (loop) {
                        this.playChord(midiNotes, durationSeconds, loop);
                    }
                }
            };

            // --- Start and Stop Scheduling ---
            osc1.start(now);
            osc2.start(now);
            osc1.stop(stopTime); // Schedule oscillator hardware stop
            osc2.stop(stopTime);
        });
    }

    /**
     * Immediately stops all currently playing or scheduled sounds managed by this player.
     * Applies a very short fade-out to prevent clicks.
     */
    public stopAll(): void {
        if (!this.audioContext || this.activeNotes.size === 0) {
            return; // Nothing to stop or context not ready
        }

        const now = this.audioContext.currentTime;
        const fadeOutDuration = 0.05; // Very short fade to prevent clicks

        console.log(`Stopping ${this.activeNotes.size} active notes...`);

        this.activeNotes.forEach(activeNote => {
            // Check if the note's natural stop time is already past
            // (might happen with overlapping calls or timing issues)
            if (now < activeNote.stopTime) {
                 // --- Immediate Gain Fade-out ---
                // Cancel any previously scheduled gain changes
                activeNote.noteGain.gain.cancelScheduledValues(now);
                // Set gain to current value and ramp down quickly
                // Use linearRamp for faster cutoff if preferred:
                // activeNote.noteGain.gain.linearRampToValueAtTime(0.0001, now + fadeOutDuration);
                activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now); // Pin current value
                activeNote.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

                // --- Stop Oscillators ---
                // Schedule stop slightly after the gain ramp finishes
                const manualStopTime = now + fadeOutDuration + 0.01;
                activeNote.oscillators.forEach(osc => {
                    try {
                        // Cancel the original stop time
                        osc.stop(manualStopTime);
                    } catch (e) {
                        // Ignore errors if oscillator is already stopped or in invalid state
                        // console.warn("Error stopping oscillator:", e);
                    }
                });
            } else {
                 // If natural stop time is past, ensure cleanup happens anyway
                 // The onended event should handle this, but as a fallback:
                 setTimeout(() => {
                     if (this.activeNotes.has(activeNote)) {
                        try {
                            activeNote.oscillators.forEach(osc => osc.disconnect());
                            activeNote.noteGain.disconnect();
                        } catch(e) {}
                        this.activeNotes.delete(activeNote);
                     }
                 }, 50); // Small delay for safety
            }
        });

        // Clear the tracking set immediately. The 'onended' callbacks will handle
        // the actual disconnection and final cleanup.
        // Note: If onended proves unreliable after manual stop, explicit disconnection
        // might be needed here, but onended is generally preferred.
        this.activeNotes.clear();
        console.log("Stop command issued for all active notes.");
    }

    /**
     * Sets the master volume.
     * @param volume - The desired volume level (0.0 to 1.0).
     */
    public setVolume(volume: number): void {
        if (this.mainGainNode && this.audioContext) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            // Use setTargetAtTime for slightly smoother volume changes if desired
            // this.mainGainNode.gain.setTargetAtTime(clampedVolume, this.audioContext.currentTime, 0.01);
            this.mainGainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
        }
    }

     /**
     * Gets the current master volume.
     * @returns The current volume level (0.0 to 1.0).
     */
    public getVolume(): number {
        if (this.mainGainNode) {
            return this.mainGainNode.gain.value;
        }
        return 0;
    }
}