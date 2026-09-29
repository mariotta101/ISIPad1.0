/* =========================================================
   ISIPad:V
   MIDI PERFORMANCE SYSTEM
   SCRIPT PRINCIPAL
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       UTILIDADES GENERALES
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const clamp = (value, min = 0, max = 100) => {
        return Math.min(max, Math.max(min, Number(value)));
    };

    const unique = (array) => [...new Set(array)];

    const modulo12 = (value) => {
        return ((Number(value) % 12) + 12) % 12;
    };


    /* =====================================================
       NOTAS
    ===================================================== */

    const NOTE_NAMES_SHARP = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B"
    ];

    const NOTE_NAMES_FLAT = [
        "C",
        "Db",
        "D",
        "Eb",
        "E",
        "F",
        "Gb",
        "G",
        "Ab",
        "A",
        "Bb",
        "B"
    ];


    function midiToNoteName(midi, flats = false) {

        midi = Number(midi);

        if (!Number.isFinite(midi)) {
            return "—";
        }

        const names = flats
            ? NOTE_NAMES_FLAT
            : NOTE_NAMES_SHARP;

        const pitch = modulo12(midi);

        const octave =
            Math.floor(midi / 12) - 1;

        return `${names[pitch]}${octave}`;
    }


    function pitchClassToName(pitchClass, flats = false) {

        const names = flats
            ? NOTE_NAMES_FLAT
            : NOTE_NAMES_SHARP;

        return names[modulo12(pitchClass)];
    }


    function midiToPitchClass(midi) {
        return modulo12(midi);
    }


    /* =====================================================
       ESTADO PRINCIPAL
    ===================================================== */

    const state = {

        midiAccess: null,

        midiInput: null,

        midiOutput: null,

        selectedMidiInputId: null,

        selectedMidiOutputId: null,

        midiChannel: null,

        activeNotes: new Set(),

        sustainedNotes: new Set(),

        sustainPedal: false,

        instruments: [],

        serviceSongs: [],

        selectedInstrumentCategory: null,

        userPads: {
            1: null,
            2: null,
            3: null,
            4: null
        },

        effects: {

            instruments: {
                reverb: 50,
                low: 50,
                mid: 50,
                high: 50,
                delay: 50,
                chorus: 50,
                drive: 50,
                filter: 50
            },

            drums: {
                reverb: 50,
                low: 50,
                mid: 50,
                high: 50,
                delay: 50,
                chorus: 50,
                drive: 50,
                filter: 50
            }

        },

        effectTarget: "instruments",

        midiAssignments: {

            reverb: null,
            low: null,
            mid: null,
            high: null,
            delay: null,
            chorus: null,
            drive: null,
            filter: null

        },

        memories: {
            1: null,
            2: null,
            3: null
        },

        currentSongIndex: -1,

        classMode: false,

        audio: {

            inputId: "",

            outputId: "",

            inputStream: null,

            audioContext: null,

            sourceNode: null,

            permissionGranted: false,

            outputSupported: false

        },

        holyrics: {

            host: "",

            port: "",

            connectionType: "",

            connected: false,

            socket: null

        }

    };


    /* =====================================================
       LIBRERÍA DE INSTRUMENTOS
    ===================================================== */

    const instrumentLibrary = {

        pianos: [
            "The Grandeur",
            "Concert Grand",
            "Studio Grand",
            "Warm Piano",
            "Bright Piano"
        ],

        synths: [
            "Synth Lead",
            "Analog Synth",
            "Digital Synth",
            "Classic Synth",
            "Modern Synth"
        ],

        pads: [
            "Warm Pad",
            "Ambient Pad",
            "Worship Pad",
            "Dark Pad",
            "Air Pad"
        ],

        guitars: [
            "Acoustic Guitar",
            "Clean Guitar",
            "Electric Guitar",
            "Ambient Guitar"
        ],

        brass: [
            "Trumpet",
            "Trombone",
            "French Horn",
            "Brass Section"
        ],

        sax: [
            "Alto Sax",
            "Tenor Sax",
            "Soprano Sax",
            "Sax Section"
        ],

        leads: [
            "Soft Lead",
            "Bright Lead",
            "Worship Lead",
            "Solo Lead"
        ],

        strings: [
            "Violin",
            "Cello",
            "String Ensemble",
            "Warm Strings"
        ],

        organ: [
            "Church Organ",
            "Hammond",
            "Vintage Organ",
            "Worship Organ"
        ]

    };


    /* =====================================================
       CANCIONES
    ===================================================== */

    const holyricsSongs = [

        "Abre Mis Ojos Oh Cristo",
        "Alabaré",
        "Cuan Grande Es Él",
        "Dios Incomparable",
        "El Poderoso de Israel",
        "Grande Es Tu Fidelidad",
        "Hay Libertad",
        "La Gloria de Dios",
        "Me Has Sostenido",
        "Mi Dios Es Grande",
        "No Hay Lugar Más Alto",
        "Oh Cuán Grande Es Dios",
        "Tu Fidelidad",
        "Unido a Ti",
        "Vengo a Adorarte"

    ];


    /* =====================================================
       ELEMENTOS DE EFECTOS
    ===================================================== */

    const effectElements = {

        reverb: {
            knob: $("knob-reverb"),
            value: $("reverb-value")
        },

        low: {
            knob: $("knob-low"),
            value: $("low-value")
        },

        mid: {
            knob: $("knob-mid"),
            value: $("mid-value")
        },

        high: {
            knob: $("knob-high"),
            value: $("high-value")
        },

        delay: {
            knob: $("knob-delay"),
            value: $("delay-value")
        },

        chorus: {
            knob: $("knob-chorus"),
            value: $("chorus-value")
        },

        drive: {
            knob: $("knob-drive"),
            value: $("drive-value")
        },

        filter: {
            knob: $("knob-filter"),
            value: $("filter-value")
        }

    };


    /* =====================================================
       EFECTOS — MOVIMIENTO DE PERILLAS
    ===================================================== */

    function getCurrentEffectBank() {

        return state.effects[state.effectTarget];

    }


    function setKnobVisual(effectName, value) {

        const item = effectElements[effectName];

        if (!item || !item.knob) {
            return;
        }

        value = clamp(value);

        /*
         * 0%   = -135°
         * 50%  = 0°
         * 100% = +135°
         */

        const angle = -135 + (value * 2.7);

        item.knob.style.transform =
            `rotate(${angle}deg)`;

        if (item.value) {
            item.value.textContent =
                `${Math.round(value)}%`;
        }

    }


    function refreshAllKnobs() {

        const bank = getCurrentEffectBank();

        Object.keys(effectElements).forEach(
            (effectName) => {

                setKnobVisual(
                    effectName,
                    bank[effectName]
                );

            }
        );

    }


    function setEffectValue(effectName, value) {

        if (!effectElements[effectName]) {
            return;
        }

        value = clamp(value);

        state.effects[
            state.effectTarget
        ][effectName] = value;

        setKnobVisual(
            effectName,
            value
        );

    }


    /* =====================================================
       DRAG DE PERILLAS
    ===================================================== */

    let knobDrag = null;


    function startKnobDrag(effectName, event) {

        if (!effectElements[effectName]) {
            return;
        }

        knobDrag = {

            effectName,

            pointerId: event.pointerId,

            startY: event.clientY,

            startValue:
                state.effects[
                    state.effectTarget
                ][effectName],

            moved: false

        };

        try {

            effectElements[
                effectName
            ].knob.setPointerCapture(
                event.pointerId
            );

        } catch (_) {}

        event.preventDefault();

    }


    function moveKnobDrag(event) {

        if (!knobDrag) {
            return;
        }

        if (
            event.pointerId !==
            knobDrag.pointerId
        ) {
            return;
        }

        const difference =
            knobDrag.startY -
            event.clientY;

        if (Math.abs(difference) > 2) {
            knobDrag.moved = true;
        }

        const newValue =
            knobDrag.startValue +
            difference * 0.7;

        setEffectValue(
            knobDrag.effectName,
            newValue
        );

    }


    function endKnobDrag(event) {

        if (!knobDrag) {
            return;
        }

        if (
            event &&
            event.pointerId !==
            knobDrag.pointerId
        ) {
            return;
        }

        const effectName =
            knobDrag.effectName;

        const moved =
            knobDrag.moved;

        knobDrag = null;

        /*
         * Si solamente se hizo clic,
         * se activa MIDI Learn.
         */

        if (!moved) {
            selectMidiLearn(effectName);
        }

    }


    Object.entries(effectElements).forEach(
        ([effectName, item]) => {

            if (!item.knob) {
                return;
            }

            item.knob.addEventListener(
                "pointerdown",
                (event) => {

                    startKnobDrag(
                        effectName,
                        event
                    );

                }
            );

            item.knob.addEventListener(
                "pointermove",
                moveKnobDrag
            );

            item.knob.addEventListener(
                "pointerup",
                endKnobDrag
            );

            item.knob.addEventListener(
                "pointercancel",
                endKnobDrag
            );

        }
    );


    /* =====================================================
       MIDI LEARN
    ===================================================== */

    let midiLearnTarget = null;


    function finishMidiLearn() {

        Object.values(effectElements)
            .forEach((item) => {

                if (item.knob) {

                    item.knob.classList.remove(
                        "midi-learning"
                    );

                }

            });

        midiLearnTarget = null;

    }


    function selectMidiLearn(effectName) {

        finishMidiLearn();

        midiLearnTarget = effectName;

        const item =
            effectElements[effectName];

        if (item && item.knob) {

            item.knob.classList.add(
                "midi-learning"
            );

        }

    }


    /* =====================================================
       SELECTOR DE EFECTOS
    ===================================================== */

    function setEffectTarget(target) {

        if (
            target !== "instruments" &&
            target !== "drums"
        ) {
            return;
        }

        state.effectTarget = target;

        const instrumentsButton =
            $("effects-target-instruments");

        const drumsButton =
            $("effects-target-drums");

        if (instrumentsButton) {

            instrumentsButton.classList.toggle(
                "active",
                target === "instruments"
            );

        }

        if (drumsButton) {

            drumsButton.classList.toggle(
                "active",
                target === "drums"
            );

        }

        const switchElement =
            document.querySelector(
                ".effects-target-switch"
            );

        if (switchElement) {

            switchElement.classList.add(
                "target-changing"
            );

            setTimeout(() => {

                switchElement.classList.remove(
                    "target-changing"
                );

            }, 120);

        }

        refreshAllKnobs();

    }


    $("effects-target-instruments")
        ?.addEventListener(
            "click",
            () => {
                setEffectTarget(
                    "instruments"
                );
            }
        );


    $("effects-target-drums")
        ?.addEventListener(
            "click",
            () => {
                setEffectTarget(
                    "drums"
                );
            }
        );


    /* =====================================================
   MOTOR COMPLETO DE ACORDES
   DETECCIÓN DE TRÍADAS, 7, 9, 11, 13,
   ALTERACIONES, SUSPENDIDOS E INVERSIONES
===================================================== */

const CHORD_FORMULAS = [

    /* =================================================
       TRÍADAS
    ================================================= */

    {
        suffix: "",
        intervals: [0, 4, 7],
        category: "Mayor",
        priority: 100
    },

    {
        suffix: "m",
        intervals: [0, 3, 7],
        category: "Menor",
        priority: 100
    },

    {
        suffix: "dim",
        intervals: [0, 3, 6],
        category: "Disminuido",
        priority: 110
    },

    {
        suffix: "aug",
        intervals: [0, 4, 8],
        category: "Aumentado",
        priority: 110
    },

    {
        suffix: "sus2",
        intervals: [0, 2, 7],
        category: "Suspendido 2",
        priority: 105
    },

    {
        suffix: "sus4",
        intervals: [0, 5, 7],
        category: "Suspendido 4",
        priority: 105
    },


    /* =================================================
       SEXTAS
    ================================================= */

    {
        suffix: "6",
        intervals: [0, 4, 7, 9],
        category: "Sexta",
        priority: 120
    },

    {
        suffix: "m6",
        intervals: [0, 3, 7, 9],
        category: "Menor sexta",
        priority: 120
    },

    {
        suffix: "6/9",
        intervals: [0, 2, 4, 7, 9],
        category: "Sexta con novena",
        priority: 130
    },

    {
        suffix: "m6/9",
        intervals: [0, 2, 3, 7, 9],
        category: "Menor 6/9",
        priority: 130
    },


    /* =================================================
       SÉPTIMAS
    ================================================= */

    {
        suffix: "7",
        intervals: [0, 4, 7, 10],
        category: "Séptima dominante",
        priority: 140
    },

    {
        suffix: "maj7",
        intervals: [0, 4, 7, 11],
        category: "Séptima mayor",
        priority: 140
    },

    {
        suffix: "m7",
        intervals: [0, 3, 7, 10],
        category: "Menor séptima",
        priority: 140
    },

    {
        suffix: "mMaj7",
        intervals: [0, 3, 7, 11],
        category: "Menor con séptima mayor",
        priority: 145
    },

    {
        suffix: "dim7",
        intervals: [0, 3, 6, 9],
        category: "Disminuido séptima",
        priority: 145
    },

    {
        suffix: "m7b5",
        intervals: [0, 3, 6, 10],
        category: "Semidisminuido",
        priority: 145
    },


    /* =================================================
       ADD
    ================================================= */

    {
        suffix: "add9",
        intervals: [0, 2, 4, 7],
        category: "Mayor add9",
        priority: 115
    },

    {
        suffix: "madd9",
        intervals: [0, 2, 3, 7],
        category: "Menor add9",
        priority: 115
    },

    {
        suffix: "add11",
        intervals: [0, 4, 5, 7],
        category: "Mayor add11",
        priority: 115
    },

    {
        suffix: "madd11",
        intervals: [0, 3, 5, 7],
        category: "Menor add11",
        priority: 115
    },

    {
        suffix: "add13",
        intervals: [0, 4, 7, 9],
        category: "Mayor add13",
        priority: 115
    },

    {
        suffix: "madd13",
        intervals: [0, 3, 7, 9],
        category: "Menor add13",
        priority: 115
    },


    /* =================================================
       NOVENAS
    ================================================= */

    {
        suffix: "9",
        intervals: [0, 2, 4, 7, 10],
        category: "Novena dominante",
        priority: 150
    },

    {
        suffix: "m9",
        intervals: [0, 2, 3, 7, 10],
        category: "Menor novena",
        priority: 150
    },

    {
        suffix: "maj9",
        intervals: [0, 2, 4, 7, 11],
        category: "Mayor novena",
        priority: 150
    },

    {
        suffix: "mMaj9",
        intervals: [0, 2, 3, 7, 11],
        category: "Menor Maj9",
        priority: 155
    },


    /* =================================================
       ONCENAS
    ================================================= */

    {
        suffix: "11",
        intervals: [0, 2, 4, 5, 7, 10],
        category: "Undécima",
        priority: 160
    },

    {
        suffix: "m11",
        intervals: [0, 2, 3, 5, 7, 10],
        category: "Menor undécima",
        priority: 160
    },

    {
        suffix: "maj11",
        intervals: [0, 2, 4, 5, 7, 11],
        category: "Mayor undécima",
        priority: 160
    },


    /* =================================================
       TRECE
    ================================================= */

    {
        suffix: "13",
        intervals: [0, 2, 4, 7, 9, 10],
        category: "Trece dominante",
        priority: 170
    },

    {
        suffix: "m13",
        intervals: [0, 2, 3, 7, 9, 10],
        category: "Menor trece",
        priority: 170
    },

    {
        suffix: "maj13",
        intervals: [0, 2, 4, 7, 9, 11],
        category: "Mayor trece",
        priority: 170
    },


    /* =================================================
       SUSPENDIDOS CON EXTENSIONES
    ================================================= */

    {
        suffix: "7sus2",
        intervals: [0, 2, 7, 10],
        category: "7 suspendido 2",
        priority: 145
    },

    {
        suffix: "7sus4",
        intervals: [0, 5, 7, 10],
        category: "7 suspendido 4",
        priority: 145
    },

    {
        suffix: "9sus4",
        intervals: [0, 2, 5, 7, 10],
        category: "9 suspendido 4",
        priority: 155
    },

    {
        suffix: "13sus4",
        intervals: [0, 2, 5, 7, 9, 10],
        category: "13 suspendido 4",
        priority: 175
    },


    /* =================================================
       ALTERACIONES DE 7
    ================================================= */

    {
        suffix: "7b5",
        intervals: [0, 4, 6, 10],
        category: "7 bemol 5",
        priority: 150
    },

    {
        suffix: "7#5",
        intervals: [0, 4, 8, 10],
        category: "7 sostenido 5",
        priority: 150
    },

    {
        suffix: "7b9",
        intervals: [0, 1, 4, 7, 10],
        category: "7 bemol 9",
        priority: 160
    },

    {
        suffix: "7#9",
        intervals: [0, 3, 4, 7, 10],
        category: "7 sostenido 9",
        priority: 160
    },

    {
        suffix: "7#11",
        intervals: [0, 4, 6, 7, 10],
        category: "7 sostenido 11",
        priority: 160
    },

    {
        suffix: "7b13",
        intervals: [0, 4, 7, 8, 10],
        category: "7 bemol 13",
        priority: 160
    },


    /* =================================================
       ALTERACIONES COMBINADAS DE 7
    ================================================= */

    {
        suffix: "7b5b9",
        intervals: [0, 1, 4, 6, 10],
        category: "7 bemol 5 bemol 9",
        priority: 175
    },

    {
        suffix: "7b5#9",
        intervals: [0, 3, 4, 6, 10],
        category: "7 bemol 5 sostenido 9",
        priority: 175
    },

    {
        suffix: "7#5b9",
        intervals: [0, 1, 4, 8, 10],
        category: "7 sostenido 5 bemol 9",
        priority: 175
    },

    {
        suffix: "7#5#9",
        intervals: [0, 3, 4, 8, 10],
        category: "7 sostenido 5 sostenido 9",
        priority: 175
    },

    {
        suffix: "7b9b13",
        intervals: [0, 1, 4, 7, 8, 10],
        category: "7 bemol 9 bemol 13",
        priority: 180
    },

    {
        suffix: "7#9#11",
        intervals: [0, 3, 4, 6, 7, 10],
        category: "7 sostenido 9 sostenido 11",
        priority: 180
    },


    /* =================================================
       MAJ7 ALTERADOS
    ================================================= */

    {
        suffix: "maj7b5",
        intervals: [0, 4, 6, 11],
        category: "Maj7 bemol 5",
        priority: 155
    },

    {
        suffix: "maj7#5",
        intervals: [0, 4, 8, 11],
        category: "Maj7 sostenido 5",
        priority: 155
    },

    {
        suffix: "maj7#11",
        intervals: [0, 4, 6, 7, 11],
        category: "Maj7 sostenido 11",
        priority: 170
    },

    {
        suffix: "maj9#11",
        intervals: [0, 2, 4, 6, 7, 11],
        category: "Maj9 sostenido 11",
        priority: 180
    },

    {
        suffix: "maj13#11",
        intervals: [0, 2, 4, 6, 7, 9, 11],
        category: "Maj13 sostenido 11",
        priority: 185
    },


    /* =================================================
       ALTERACIONES DE 9
    ================================================= */

    {
        suffix: "9b5",
        intervals: [0, 2, 4, 6, 10],
        category: "9 bemol 5",
        priority: 165
    },

    {
        suffix: "9#5",
        intervals: [0, 2, 4, 8, 10],
        category: "9 sostenido 5",
        priority: 165
    },

    {
        suffix: "9b13",
        intervals: [0, 2, 4, 7, 8, 10],
        category: "9 bemol 13",
        priority: 170
    },

    {
        suffix: "9#11",
        intervals: [0, 2, 4, 6, 7, 10],
        category: "9 sostenido 11",
        priority: 170
    },


    /* =================================================
       ALTERACIONES DE 13
    ================================================= */

    {
        suffix: "13b9",
        intervals: [0, 1, 4, 7, 9, 10],
        category: "13 bemol 9",
        priority: 180
    },

    {
        suffix: "13#9",
        intervals: [0, 3, 4, 7, 9, 10],
        category: "13 sostenido 9",
        priority: 180
    },

    {
        suffix: "13b5",
        intervals: [0, 2, 4, 6, 9, 10],
        category: "13 bemol 5",
        priority: 180
    },

    {
        suffix: "13#11",
        intervals: [0, 2, 4, 6, 7, 9, 10],
        category: "13 sostenido 11",
        priority: 190
    }

];


/* =====================================================
   UTILIDADES DEL MOTOR DE ACORDES
===================================================== */

function sameIntervalSet(
    available,
    formula
) {

    if (
        available.size !==
        formula.length
    ) {
        return false;
    }

    return formula.every(
        interval =>
            available.has(
                modulo12(interval)
            )
    );

}


function containsAllIntervals(
    available,
    formula
) {

    return formula.every(
        interval =>
            available.has(
                modulo12(interval)
            )
    );

}


function countMissingIntervals(
    available,
    formula
) {

    let missing = 0;

    formula.forEach(
        interval => {

            if (
                !available.has(
                    modulo12(interval)
                )
            ) {
                missing++;
            }

        }
    );

    return missing;

}


function countExtraIntervals(
    available,
    formula
) {

    let extra = 0;

    available.forEach(
        interval => {

            if (
                !formula.includes(
                    interval
                )
            ) {
                extra++;
            }

        }
    );

    return extra;

}


/* =====================================================
   NOMBRE DE LA RAÍZ
===================================================== */

function shouldUseFlats(
    rootPitch,
    pitchClasses
) {

    /*
     * Para las raíces accidentales usamos
     * preferencia musical natural:
     *
     * C# / Db
     * D# / Eb
     * F# / Gb
     * G# / Ab
     * A# / Bb
     */

    const flatPreference = {
        1: true,
        3: true,
        6: true,
        8: true,
        10: true
    };


    if (
        flatPreference[rootPitch]
    ) {

        /*
         * Si el acorde contiene muchas
         * alteraciones bemol, usamos bemoles.
         */

        const flatCount =
            pitchClasses.filter(
                pc =>
                    [1, 3, 6, 8, 10]
                        .includes(pc)
            ).length;


        const naturalCount =
            pitchClasses.filter(
                pc =>
                    [0, 2, 4, 5, 7, 9, 11]
                        .includes(pc)
            ).length;


        return flatCount >= naturalCount;

    }


    return false;

}


/* =====================================================
   DESCRIPCIÓN MUSICAL DE LAS EXTENSIONES
===================================================== */

function describeChordExtensions(
    formula,
    relative
) {

    const intervals =
        new Set(
            formula.intervals.map(
                modulo12
            )
        );


    const labels = [];


    /*
     * Tercera
     */

    if (
        intervals.has(3) &&
        intervals.has(4)
    ) {

        labels.push(
            "♭3 + 3"
        );

    }


    /*
     * Segunda / novena
     */

    if (
        intervals.has(1)
    ) {

        labels.push("♭9");

    } else if (
        intervals.has(2)
    ) {

        labels.push("9");

    }


    /*
     * Cuarta / undécima
     */

    if (
        intervals.has(5)
    ) {

        labels.push("11");

    }


    /*
     * Quinta
     */

    if (
        intervals.has(6) &&
        intervals.has(7)
    ) {

        labels.push("♭5 / #11");

    } else if (
        intervals.has(6)
    ) {

        labels.push("♭5");

    }


    if (
        intervals.has(8)
    ) {

        if (
            intervals.has(7)
        ) {

            labels.push("#5");

        } else {

            labels.push("♭13");

        }

    }


    /*
     * Sexta / trece
     */

    if (
        intervals.has(9)
    ) {

        labels.push("13");

    }


    /*
     * Séptima menor
     */

    if (
        intervals.has(10)
    ) {

        labels.push("♭7");

    }


    /*
     * Séptima mayor
     */

    if (
        intervals.has(11)
    ) {

        labels.push("maj7");

    }


    /*
     * Evitamos repetir información
     */

    const clean =
        unique(labels);


    if (!clean.length) {

        return "TRÍADA";

    }


    return clean.join(" · ");

}


/* =====================================================
   INVERSIÓN
===================================================== */

function detectInversion(
    midiNotes,
    root
) {

    if (
        !midiNotes ||
        !midiNotes.length ||
        root === null ||
        root === undefined
    ) {

        return "—";

    }


    const sorted =
        [...midiNotes]
            .map(Number)
            .filter(
                Number.isFinite
            )
            .sort(
                (a, b) => a - b
            );


    if (!sorted.length) {

        return "—";

    }


    const bassPitch =
        midiToPitchClass(
            sorted[0]
        );


    if (
        bassPitch === root
    ) {

        return "FUNDAMENTAL";

    }


    const interval =
        modulo12(
            bassPitch - root
        );


    /*
     * Tercera = primera inversión
     * Quinta = segunda inversión
     * Séptima = tercera inversión
     */

    if (
        interval === 3 ||
        interval === 4
    ) {

        return `1ª INVERSIÓN — BAJO: ${
            pitchClassToName(
                bassPitch
            )
        }`;

    }


    if (
        interval === 5 ||
        interval === 6 ||
        interval === 7
    ) {

        return `2ª INVERSIÓN — BAJO: ${
            pitchClassToName(
                bassPitch
            )
        }`;

    }


    if (
        interval === 9 ||
        interval === 10 ||
        interval === 11
    ) {

        return `3ª INVERSIÓN — BAJO: ${
            pitchClassToName(
                bassPitch
            )
        }`;

    }


    return `BAJO ALTERADO — ${
        pitchClassToName(
            bassPitch
        )
    }`;

}


/* =====================================================
   DETECTOR PRINCIPAL
===================================================== */

function detectChord(
    noteArray
) {

    if (
        !noteArray ||
        !noteArray.length
    ) {

        return {

            name: "—",

            root: null,

            suffix: "",

            extensions: "—",

            inversion: "—",

            formula: [],

            confidence: 0

        };

    }


    /*
     * Limpiamos las notas MIDI.
     */

    const midiNotes =
        [...noteArray]
            .map(Number)
            .filter(
                Number.isFinite
            )
            .sort(
                (a, b) => a - b
            );


    if (!midiNotes.length) {

        return {

            name: "—",

            root: null,

            suffix: "",

            extensions: "—",

            inversion: "—",

            formula: [],

            confidence: 0

        };

    }


    /*
     * Eliminamos duplicados de pitch class,
     * pero NO eliminamos las notas MIDI originales,
     * porque necesitamos el bajo para las inversiones.
     */

    const pitchClasses =
        unique(
            midiNotes.map(
                midiToPitchClass
            )
        );


    /*
     * Una sola nota:
     */

    if (
        pitchClasses.length === 1
    ) {

        const root =
            pitchClasses[0];


        return {

            name:
                pitchClassToName(
                    root
                ),

            root,

            suffix: "",

            extensions: "NOTA",

            inversion: "FUNDAMENTAL",

            formula: [0],

            confidence: 100

        };

    }


    /*
     * Necesitamos al menos tres clases
     * de altura para reconocer un acorde.
     */

    if (
        pitchClasses.length < 3
    ) {

        const root =
            pitchClasses[0];


        return {

            name:
                pitchClassToName(
                    root
                ),

            root,

            suffix: "",

            extensions: "ACORDE INCOMPLETO",

            inversion:
                detectInversion(
                    midiNotes,
                    root
                ),

            formula: [],

            confidence: 20

        };

    }


    const candidates = [];


    /* =================================================
       BUSCAR TODAS LAS RAÍCES POSIBLES
    ================================================= */

    for (
        let root = 0;
        root < 12;
        root++
    ) {

        const relative =
            new Set(
                pitchClasses.map(
                    pc =>
                        modulo12(
                            pc - root
                        )
                )
            );


        for (
            const formula
            of CHORD_FORMULAS
        ) {

            const formulaSet =
                new Set(
                    formula.intervals
                        .map(
                            modulo12
                        )
                );


            const exact =
                sameIntervalSet(
                    relative,
                    formula.intervals
                );


            /*
             * Solo agregamos coincidencias
             * completas en esta primera fase.
             */

            if (exact) {

                const bassIsRoot =
                    midiToPitchClass(
                        midiNotes[0]
                    ) === root;


                candidates.push({

                    root,

                    formula,

                    relative,

                    exact: true,

                    missing: 0,

                    extra: 0,

                    bassIsRoot,

                    score:
                        10000 +
                        formula.priority +
                        (
                            formula.intervals.length *
                            20
                        ) +
                        (
                            bassIsRoot
                                ? 500
                                : 0
                        )

                });

            }

        }

    }


    /* =================================================
       SI HAY COINCIDENCIA EXACTA,
       NO PERMITIMOS QUE UNA PARCIAL LA REEMPLACE.
    ================================================= */

    if (
        candidates.length
    ) {

        candidates.sort(
            (a, b) =>
                b.score - a.score
        );


        const best =
            candidates[0];


        const root =
            best.root;


        const preferFlats =
            shouldUseFlats(
                root,
                pitchClasses
            );


        const rootName =
            pitchClassToName(
                root,
                preferFlats
            );


        const chordName =
            `${rootName}${best.formula.suffix}`;


        return {

            name:
                chordName,

            root,

            suffix:
                best.formula.suffix,

            extensions:
                describeChordExtensions(
                    best.formula,
                    best.relative
                ),

            inversion:
                detectInversion(
                    midiNotes,
                    root
                ),

            formula:
                best.formula.intervals,

            confidence: 100

        };

    }


    /* =================================================
       SEGUNDA FASE:
       ACORDES INCOMPLETOS
    ================================================= */

    const partialCandidates = [];


    for (
        let root = 0;
        root < 12;
        root++
    ) {

        const relative =
            new Set(
                pitchClasses.map(
                    pc =>
                        modulo12(
                            pc - root
                        )
                )
            );


        for (
            const formula
            of CHORD_FORMULAS
        ) {

            /*
             * Para una detección parcial,
             * necesitamos al menos tres notas
             * de la fórmula.
             */

            if (
                formula.intervals.length < 3
            ) {
                continue;
            }


            const missing =
                countMissingIntervals(
                    relative,
                    formula.intervals
                );


            const extra =
                countExtraIntervals(
                    relative,
                    formula.intervals
                );


            /*
             * No aceptamos notas que no pertenecen
             * al acorde durante la detección parcial.
             */

            if (
                extra > 0
            ) {
                continue;
            }


            /*
             * No permitimos demasiadas notas faltantes.
             */

            if (
                missing > 1
            ) {
                continue;
            }


            const present =
                formula.intervals.length -
                missing;


            const coverage =
                present /
                formula.intervals.length;


            if (
                coverage < 0.70
            ) {
                continue;
            }


            const bassIsRoot =
                midiToPitchClass(
                    midiNotes[0]
                ) === root;


            let score =
                1000 +
                (
                    coverage *
                    500
                ) +
                formula.priority;


            if (bassIsRoot) {

                score += 350;

            }


            score -=
                missing * 250;


            partialCandidates.push({

                root,

                formula,

                relative,

                exact: false,

                missing,

                extra,

                bassIsRoot,

                score

            });

        }

    }


    /* =================================================
       SIN DETECCIÓN
    ================================================= */

    if (
        !partialCandidates.length
    ) {

        const root =
            midiToPitchClass(
                midiNotes[0]
            );


        return {

            name:
                pitchClassToName(
                    root
                ),

            root,

            suffix: "",

            extensions:
                "ACORDE NO CLASIFICADO",

            inversion:
                detectInversion(
                    midiNotes,
                    root
                ),

            formula: [],

            confidence: 20

        };

    }


    partialCandidates.sort(
        (a, b) =>
            b.score - a.score
    );


    const best =
        partialCandidates[0];


    const root =
        best.root;


    const preferFlats =
        shouldUseFlats(
            root,
            pitchClasses
        );


    const rootName =
        pitchClassToName(
            root,
            preferFlats
        );


    const chordName =
        `${rootName}${best.formula.suffix}`;


    return {

        name:
            chordName,

        root,

        suffix:
            best.formula.suffix,

        extensions:
            describeChordExtensions(
                best.formula,
                best.relative
            ),

        inversion:
            detectInversion(
                midiNotes,
                root
            ),

        formula:
            best.formula.intervals,

        confidence: 78

    };

}

    /* =====================================================
       MODO CLASE
    ===================================================== */

    function abrirModoClase() {

        const classMode =
            $("class-mode");

        if (!classMode) {
            return;
        }

        state.classMode = true;

        classMode.classList.remove(
            "hidden"
        );

        construirTecladoClase();

        actualizarPantallaClase();

    }


    function cerrarModoClase() {

        const classMode =
            $("class-mode");

        if (!classMode) {
            return;
        }

        state.classMode = false;

        state.activeNotes.clear();

        state.sustainedNotes.clear();

        state.sustainPedal = false;

        actualizarVisualTeclado();

        actualizarPantallaClase();

        classMode.classList.add(
            "hidden"
        );

    }


    /* =====================================================
       TECLADO VIRTUAL
       C2 — C7
       61 NOTAS
    ===================================================== */

    function construirTecladoClase() {

        const keyboard =
            $("virtual-keyboard");

        if (!keyboard) {
            return;
        }

        keyboard.innerHTML = "";

        /*
         * Se mantienen exactamente las 61 notas:
         *
         * MIDI 36 = C2
         * MIDI 96 = C7
         */

        const whiteNotes = [];

        for (
            let midi = 36;
            midi <= 96;
            midi++
        ) {

            const pitch =
                midiToPitchClass(midi);

            const isBlack =
                [
                    1,
                    3,
                    6,
                    8,
                    10
                ].includes(pitch);

            if (!isBlack) {
                whiteNotes.push(midi);
            }

        }


        /*
         * TECLAS BLANCAS
         */

        whiteNotes.forEach(
            (midi) => {

                const key =
                    document.createElement(
                        "button"
                    );

                key.type = "button";

                key.className =
                    "key-white";

                key.dataset.midi =
                    String(midi);

                /*
                 * No ponemos texto dentro
                 * de las teclas.
                 */

                agregarEventosTecla(
                    key,
                    midi
                );

                keyboard.appendChild(
                    key
                );

            }
        );


        /*
         * TECLAS NEGRAS
         *
         * Posicionamiento relativo a las
         * teclas blancas existentes.
         */

        const whiteCount =
            whiteNotes.length;


        whiteNotes.forEach(
            (whiteMidi, index) => {

                const nextMidi =
                    whiteMidi + 1;

                if (
                    nextMidi > 96
                ) {
                    return;
                }

                const nextPitch =
                    midiToPitchClass(
                        nextMidi
                    );


                const blackExists =
                    [
                        1,
                        3,
                        6,
                        8,
                        10
                    ].includes(nextPitch);


                if (!blackExists) {
                    return;
                }


                /*
                 * No existe tecla negra
                 * después de E ni después de B.
                 */

                const whitePitch =
                    midiToPitchClass(
                        whiteMidi
                    );

                if (
                    whitePitch === 4 ||
                    whitePitch === 11
                ) {
                    return;
                }


                const key =
                    document.createElement(
                        "button"
                    );

                key.type = "button";

                key.className =
                    "key-black";

                key.dataset.midi =
                    String(nextMidi);


                /*
                 * Cada tecla blanca ocupa
                 * aproximadamente una fracción
                 * del teclado.
                 */

                const position =
                    (
                        (index + 1) /
                        whiteCount
                    ) * 100;


                key.style.left =
                    `calc(${position}% - 1.025%)`;


                agregarEventosTecla(
                    key,
                    nextMidi
                );

                keyboard.appendChild(
                    key
                );

            }
        );

        actualizarVisualTeclado();

    }


    /* =====================================================
       EVENTOS DEL TECLADO VIRTUAL
    ===================================================== */

    function agregarEventosTecla(
        key,
        midi
    ) {

        key.addEventListener(
            "pointerdown",
            (event) => {

                event.preventDefault();

                key.setPointerCapture?.(
                    event.pointerId
                );

                notaVirtualDown(
                    midi
                );

            }
        );


        key.addEventListener(
            "pointerup",
            (event) => {

                event.preventDefault();

                notaVirtualUp(
                    midi
                );

            }
        );


        key.addEventListener(
            "pointercancel",
            () => {

                notaVirtualUp(
                    midi
                );

            }
        );

    }


    function notaVirtualDown(midi) {

        state.activeNotes.add(
            midi
        );

        state.sustainedNotes.delete(
            midi
        );

        actualizarVisualTeclado();

        actualizarPantallaClase();

    }


    function notaVirtualUp(midi) {

        if (
            state.sustainPedal
        ) {

            state.activeNotes.delete(
                midi
            );

            state.sustainedNotes.add(
                midi
            );

        } else {

            state.activeNotes.delete(
                midi
            );

            state.sustainedNotes.delete(
                midi
            );

        }

        actualizarVisualTeclado();

        actualizarPantallaClase();

    }


    /* =====================================================
       VISUAL DEL TECLADO
    ===================================================== */

    function actualizarVisualTeclado() {

        const keyboard =
            $("virtual-keyboard");

        if (!keyboard) {
            return;
        }

        const keys =
            keyboard.querySelectorAll(
                "[data-midi]"
            );


        keys.forEach((key) => {

            const midi =
                Number(
                    key.dataset.midi
                );

            key.classList.toggle(
                "active",
                state.activeNotes.has(
                    midi
                )
            );

            key.classList.toggle(
                "sustain",
                state.sustainedNotes.has(
                    midi
                )
            );

        });

    }


    /* =====================================================
       PANTALLA MODO CLASE
    ===================================================== */

    function getAllCurrentNotes() {

        return unique([
            ...state.activeNotes,
            ...state.sustainedNotes
        ]).sort(
            (a, b) => a - b
        );

    }


    function actualizarPantallaClase() {

        const notes =
            getAllCurrentNotes();


        const detectedNotes =
            $("detected-notes");

        const chordName =
            $("chord-name");

        const detectedChord =
            $("detected-chord");

        const chordExtensions =
            $("chord-extensions");

        const chordInversion =
            $("chord-inversion");

        const liveNoteCount =
            $("live-note-count");

        const liveNotes =
            $("live-notes");

        const sustainStatus =
            $("sustain-status");


        if (detectedNotes) {

            detectedNotes.textContent =
                notes.length
                    ? notes
                        .map(
                            midi =>
                                midiToNoteName(
                                    midi
                                )
                        )
                        .join(" · ")
                    : "—";

        }


        if (liveNoteCount) {

            liveNoteCount.textContent =
                `${notes.length} ${
                    notes.length === 1
                        ? "NOTA"
                        : "NOTAS"
                }`;

        }


        if (liveNotes) {

            liveNotes.innerHTML = "";

            notes.forEach((midi) => {

                const element =
                    document.createElement(
                        "div"
                    );

                element.className =
                    "live-note";


                if (
                    state.sustainedNotes.has(
                        midi
                    )
                ) {

                    element.classList.add(
                        "sustain"
                    );

                }


                element.textContent =
                    midiToNoteName(
                        midi
                    );

                liveNotes.appendChild(
                    element
                );

            });

        }


        if (sustainStatus) {

            sustainStatus.textContent =
                state.sustainPedal
                    ? "SUSTAIN ON"
                    : "SUSTAIN OFF";

        }


        if (!notes.length) {

            if (chordName) {
                chordName.textContent = "—";
            }

            if (detectedChord) {
                detectedChord.textContent = "—";
            }

            if (chordExtensions) {
                chordExtensions.textContent = "—";
            }

            if (chordInversion) {
                chordInversion.textContent = "—";
            }

            return;

        }


        const chord =
            detectChord(notes);


        if (chordName) {
            chordName.textContent =
                chord.name;
        }


        if (detectedChord) {
            detectedChord.textContent =
                chord.name;
        }


        if (chordExtensions) {
            chordExtensions.textContent =
                chord.extensions;
        }


        if (chordInversion) {
            chordInversion.textContent =
                chord.inversion;
        }

    }


    /* =====================================================
       MIDI
    ===================================================== */

    async function iniciarMIDI() {

        if (
            !navigator.requestMIDIAccess
        ) {

            actualizarEstadoMIDI(
                "MIDI NO DISPONIBLE"
            );

            return;

        }


        try {

            state.midiAccess =
                await navigator.requestMIDIAccess({
                    sysex: false
                });


            state.midiAccess.onstatechange =
                manejarCambioMIDI;


            actualizarListaMIDI();

            actualizarEstadoMIDI(
                "LISTO"
            );

        } catch (error) {

            console.error(
                "Error MIDI:",
                error
            );

            actualizarEstadoMIDI(
                "ERROR MIDI"
            );

        }

    }


    function actualizarEstadoMIDI(
        status
    ) {

        const topStatus =
            $("midi-status");

        const settingsStatus =
            $("midi-settings-status");


        if (topStatus) {
            topStatus.textContent =
                status;
        }

        if (settingsStatus) {
            settingsStatus.textContent =
                status;
        }

    }


    function manejarCambioMIDI() {

        actualizarListaMIDI();

    }


    function actualizarListaMIDI() {

        if (!state.midiAccess) {
            return;
        }


        const select =
            $("midi-device-select");

        if (!select) {
            return;
        }


        const previous =
            state.selectedMidiInputId ||
            select.value;


        select.innerHTML = "";


        const firstOption =
            document.createElement(
                "option"
            );

        firstOption.value = "";

        firstOption.textContent =
            "SELECCIONAR CONTROLADOR";

        select.appendChild(
            firstOption
        );


        const inputs =
            [...state.midiAccess.inputs.values()];


        const outputs =
            [...state.midiAccess.outputs.values()];


        inputs.forEach((input) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                input.id;

            option.textContent =
                input.name ||
                "DISPOSITIVO MIDI";

            select.appendChild(
                option
            );

        });


        /*
         * Si había una selección válida,
         * la conservamos.
         */

        if (
            previous &&
            inputs.some(
                input =>
                    input.id === previous
            )
        ) {

            select.value =
                previous;

        }


        const empty =
            $("midi-device-empty");

        if (empty) {

            empty.classList.toggle(
                "hidden",
                inputs.length > 0
            );

        }


        /*
         * Si todavía no hay controlador
         * seleccionado pero existe uno,
         * no lo conectamos automáticamente
         * si el usuario ya había elegido otro.
         */

        if (
            !state.midiInput &&
            state.selectedMidiInputId
        ) {

            conectarEntradaMIDI(
                state.selectedMidiInputId
            );

        }


        if (
            state.selectedMidiOutputId &&
            outputs.some(
                output =>
                    output.id ===
                    state.selectedMidiOutputId
            )
        ) {

            state.midiOutput =
                state.midiAccess.outputs.get(
                    state.selectedMidiOutputId
                );

        }

    }


    async function conectarEntradaMIDI(
        inputId
    ) {

        if (!state.midiAccess) {
            return;
        }


        const input =
            state.midiAccess.inputs.get(
                inputId
            );


        if (!input) {
            return;
        }


        if (state.midiInput) {

            state.midiInput.onmidimessage =
                null;

        }


        state.midiInput =
            input;

        state.selectedMidiInputId =
            input.id;


        input.onmidimessage =
            manejarMensajeMIDI;


        const select =
            $("midi-device-select");

        if (select) {
            select.value =
                input.id;
        }


        const device =
            $("midi-device");

        if (device) {

            device.textContent =
                input.name ||
                "DISPOSITIVO MIDI";

        }


        actualizarEstadoMIDI(
            "CONECTADO"
        );

    }


    function desconectarMIDI() {

        if (state.midiInput) {

            state.midiInput.onmidimessage =
                null;

        }

        state.midiInput = null;

        state.selectedMidiInputId = null;

        const device =
            $("midi-device");

        if (device) {
            device.textContent =
                "SIN DISPOSITIVO";
        }

        actualizarEstadoMIDI(
            "DESCONECTADO"
        );

    }
/* =========================================================
   MIDI MAPPING — PROCESAR MENSAJE
========================================================= */

function midiMappingProcesarMensaje(data) {

    if (!data || data.length < 1) {
        return;
    }

    // El modo aprendizaje debe estar activo
    if (!midiMappingLearning) {
        return;
    }

    const status = data[0];
    const tipo = status & 0xF0;
    const canal = (status & 0x0F) + 1;

    const valor1 = data.length > 1 ? data[1] : 0;
    const valor2 = data.length > 2 ? data[2] : 0;

    console.log(
        "🎹 MIDI MAPPING DETECTADO:",
        {
            status,
            tipo,
            canal,
            valor1,
            valor2
        }
    );

    const detectedType =
        document.getElementById(
            "mapping-detected-type"
        );

    const originalValue =
        document.getElementById(
            "mapping-original-value"
        );

    const lastNote =
        document.getElementById(
            "mapping-last-note"
        );

    const learnMessage =
        document.getElementById(
            "mapping-learn-message"
        );


    /* =========================================
       MOSTRAR TIPO DE MENSAJE
    ========================================= */

    let tipoTexto = "MIDI";

    if (tipo === 0x90) {
        tipoTexto =
            valor2 > 0
                ? "NOTA ON"
                : "NOTA OFF";
    }

    else if (tipo === 0x80) {
        tipoTexto = "NOTA OFF";
    }

    else if (tipo === 0xB0) {
        tipoTexto = "CONTROL CHANGE";
    }

    else if (tipo === 0xC0) {
        tipoTexto = "PROGRAM CHANGE";
    }


    if (detectedType) {
        detectedType.textContent =
            tipoTexto;
    }


    /* =========================================
       MOSTRAR VALOR ORIGINAL
    ========================================= */

    if (originalValue) {

        if (
            tipo === 0x90 ||
            tipo === 0x80
        ) {

            originalValue.textContent =
                `MIDI ${valor1} · Canal ${canal}`;

        } else {

            originalValue.textContent =
                `MIDI ${valor1} · Valor ${valor2} · Canal ${canal}`;

        }
    }


    /* =========================================
       MOSTRAR ÚLTIMA NOTA
    ========================================= */

    if (
        lastNote &&
        (
            tipo === 0x90 ||
            tipo === 0x80
        )
    ) {

        lastNote.textContent =
            `MIDI ${valor1}`;

    }


    /* =========================================
       MENSAJE DE APRENDIZAJE
    ========================================= */

    if (learnMessage) {

        learnMessage.textContent =
            `Detectado: ${tipoTexto} · MIDI ${valor1}`;

    }


    console.log(
        `ISIPad:V → MIDI detectado: ${tipoTexto} / ${valor1}`
    );

}

    /* =====================================================
       MENSAJES MIDI
    ===================================================== */

    function manejarMensajeMIDI(event) {

        const data =
            event.data;
        
        midiMappingProcesarMensaje(data);

        if (
            !data ||
            data.length < 1
        ) {
            return;
        }


        const status =
            data[0];

        const command =
            status & 0xF0;

        const channel =
            status & 0x0F;

        const data1 =
            data[1] ?? 0;

        const data2 =
            data[2] ?? 0;


        /*
         * Filtro de canal.
         */

        if (
            state.midiChannel !== null &&
            channel !== state.midiChannel
        ) {

            return;

        }


        /*
         * NOTE ON
         */

        if (
            command === 0x90 &&
            data2 > 0
        ) {

            manejarNotaOn(
                data1,
                data2,
                channel
            );

            return;

        }


        /*
         * NOTE OFF
         */

        if (
            command === 0x80 ||
            (
                command === 0x90 &&
                data2 === 0
            )
        ) {

            manejarNotaOff(
                data1,
                channel
            );

            return;

        }


        /*
         * CONTROL CHANGE
         */

        if (command === 0xB0) {

            manejarCC(
                data1,
                data2,
                channel
            );

        }

    }


    /* =====================================================
       NOTE ON
    ===================================================== */

    function manejarNotaOn(
        note,
        velocity,
        channel
    ) {

        state.activeNotes.add(
            note
        );

        state.sustainedNotes.delete(
            note
        );

        actualizarVisualTeclado();

        actualizarPantallaClase();

    }


    /* =====================================================
       NOTE OFF
    ===================================================== */

    function manejarNotaOff(
        note,
        channel
    ) {

        if (state.sustainPedal) {

            state.activeNotes.delete(
                note
            );

            state.sustainedNotes.add(
                note
            );

        } else {

            state.activeNotes.delete(
                note
            );

            state.sustainedNotes.delete(
                note
            );

        }

        actualizarVisualTeclado();

        actualizarPantallaClase();

    }


    /* =====================================================
       CONTROL CHANGE
    ===================================================== */

    function manejarCC(
        cc,
        value,
        channel
    ) {

        /*
         * Sustain pedal CC64
         */

        if (cc === 64) {

            manejarSustain(
                value >= 64
            );

            return;

        }


        /*
         * MIDI LEARN
         */

        if (midiLearnTarget) {

            state.midiAssignments[
                midiLearnTarget
            ] = {

                cc,

                channel

            };


            /*
             * Aplicamos inmediatamente
             * el valor recibido.
             */

            const percent =
                (value / 127) * 100;

            setEffectValue(
                midiLearnTarget,
                percent
            );


            finishMidiLearn();

            guardarEstadoLocal();

            return;

        }


        /*
         * CC ya asignados
         */

        Object.entries(
            state.midiAssignments
        ).forEach(
            ([effectName, assignment]) => {

                if (!assignment) {
                    return;
                }

                if (
                    assignment.cc !== cc
                ) {
                    return;
                }

                if (
                    assignment.channel !==
                    channel
                ) {
                    return;
                }

                const percent =
                    (value / 127) * 100;

                setEffectValue(
                    effectName,
                    percent
                );

            }
        );

    }


    /* =====================================================
       SUSTAIN
    ===================================================== */

    function manejarSustain(active) {

        state.sustainPedal =
            active;


        if (!active) {

            state.sustainedNotes.clear();

        }


        actualizarVisualTeclado();

        actualizarPantallaClase();

    }


    /* =====================================================
       SELECCIÓN MIDI
    ===================================================== */

    $("midi-device-select")
        ?.addEventListener(
            "change",
            (event) => {

                const id =
                    event.target.value;

                if (!id) {

                    desconectarMIDI();

                    return;

                }

                conectarEntradaMIDI(
                    id
                );

            }
        );


    $("midi-channel")
        ?.addEventListener(
            "change",
            (event) => {

                const value =
                    event.target.value;

                if (
                    value === "all"
                ) {

                    state.midiChannel =
                        null;

                } else {

                    state.midiChannel =
                        Number(value) - 1;

                }

            }
        );


    /* =====================================================
       INSTRUMENTOS
    ===================================================== */

    function abrirInstrumentModal() {

        const modal =
            $("instrument-modal");

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "hidden"
        );

        renderInstrumentCategories();

    }


    function cerrarInstrumentModal() {

        $("instrument-modal")
            ?.classList.add(
                "hidden"
            );

    }


    function renderInstrumentCategories() {

        const options =
            $("instrument-options");

        if (!options) {
            return;
        }

        options.innerHTML = "";

        if (
            !state.selectedInstrumentCategory
        ) {

            options.innerHTML =
                `<div style="
                    grid-column:1/-1;
                    padding:12px;
                    color:#777;
                    font-size:9px;
                ">
                    SELECCIONA UNA CATEGORÍA
                </div>`;

            return;

        }


        const instruments =
            instrumentLibrary[
                state.selectedInstrumentCategory
            ] || [];


        instruments.forEach(
            (instrument) => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.className =
                    "instrument-option";

                button.textContent =
                    instrument;


                button.addEventListener(
                    "click",
                    () => {

                        addInstrument(
                            instrument
                        );

                    }
                );


                options.appendChild(
                    button
                );

            }
        );

    }


    function addInstrument(
    name
) {

    /* =====================================================
       MÁXIMO 6 INSTRUMENTOS
    ===================================================== */

    if (
        state.instruments.length >= 3
    ) {
        return;
    }


    const instrument = {

        id:
            `instrument-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

        name,

        volume: 100

    };


    state.instruments.push(
        instrument
    );

    renderActiveInstruments();

    cerrarInstrumentModal();

    guardarEstadoLocal();

}


    function renderActiveInstruments() {

        const container =
            $("active-instruments");

        if (!container) {
            return;
        }

        container.innerHTML = "";


        state.instruments.forEach(
            (instrument) => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "instrument-item";


                const name =
                    document.createElement(
                        "span"
                    );

                name.className =
                    "instrument-name";

                name.textContent =
                    instrument.name;


                const volume =
                    document.createElement(
                        "span"
                    );

                volume.className =
                    "instrument-volume";

                volume.textContent =
                    `${instrument.volume}%`;

                volume.title =
                    "Arrastra verticalmente para cambiar volumen";


                const remove =
                    document.createElement(
                        "button"
                    );

                remove.type = "button";

                remove.className =
                    "instrument-delete";

                remove.textContent =
                    "×";


                let startY = null;
                let startVolume = null;


                volume.addEventListener(
                    "pointerdown",
                    (event) => {

                        startY =
                            event.clientY;

                        startVolume =
                            instrument.volume;

                        volume.setPointerCapture?.(
                            event.pointerId
                        );

                    }
                );


                volume.addEventListener(
                    "pointermove",
                    (event) => {

                        if (
                            startY === null
                        ) {
                            return;
                        }

                        const diff =
                            startY -
                            event.clientY;

                        instrument.volume =
                            clamp(
                                startVolume +
                                diff * 0.7
                            );

                        volume.textContent =
                            `${Math.round(
                                instrument.volume
                            )}%`;

                    }
                );


                volume.addEventListener(
                    "pointerup",
                    () => {

                        startY = null;
                        startVolume = null;

                        guardarEstadoLocal();

                    }
                );


                remove.addEventListener(
                    "click",
                    () => {

                        state.instruments =
                            state.instruments.filter(
                                item =>
                                    item.id !==
                                    instrument.id
                            );

                        renderActiveInstruments();

                        guardarEstadoLocal();

                    }
                );


                item.appendChild(name);

                item.appendChild(volume);

                item.appendChild(remove);

                container.appendChild(item);

            }
        );

    }


    document
        .querySelectorAll(
            ".instrument-category"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        state.selectedInstrumentCategory =
                            button.dataset.category;

                        renderInstrumentCategories();

                    }
                );

            }
        );


    $("btn-add-instrument")
        ?.addEventListener(
            "click",
            abrirInstrumentModal
        );


    $("close-instrument-modal")
        ?.addEventListener(
            "click",
            cerrarInstrumentModal
        );


    /* =====================================================
       CANCIONES / HOLYRICS
    ===================================================== */

    function abrirSongModal() {

        const modal =
            $("song-modal");

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "hidden"
        );

        const search =
            $("song-search-input");

        if (search) {

            search.value = "";

            renderSongResults(
                holyricsSongs
            );

            setTimeout(
                () => search.focus(),
                50
            );

        }

    }


    function cerrarSongModal() {

        $("song-modal")
            ?.classList.add(
                "hidden"
            );

    }


    function renderSongResults(
        songs
    ) {

        const container =
            $("song-search-results");

        if (!container) {
            return;
        }

        container.innerHTML = "";


        songs.forEach(
            (song) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "song-result";


                const name =
                    document.createElement(
                        "span"
                    );

                name.className =
                    "song-result-name";

                name.textContent =
                    song;


                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.className =
                    "song-add-button";

                button.textContent =
                    "+";


                button.addEventListener(
                    "click",
                    () => {

                        addSong(song);

                    }
                );


                row.appendChild(name);

                row.appendChild(button);

                container.appendChild(row);

            }
        );

    }


    function addSong(title) {

        state.serviceSongs.push({
            title
        });

        state.currentSongIndex =
            state.serviceSongs.length - 1;

        renderServiceList();

        cerrarSongModal();

        guardarEstadoLocal();

        enviarHolyricsComando(
            "song",
            {
                title
            }
        );

    }


    function renderServiceList() {

        const list =
            $("service-list");

        if (!list) {
            return;
        }

        list.innerHTML = "";


        state.serviceSongs.forEach(
            (song, index) => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "song-item";


                if (
                    index ===
                    state.currentSongIndex
                ) {

                    item.classList.add(
                        "active"
                    );

                }


                const number =
                    document.createElement(
                        "span"
                    );

                number.className =
                    "song-number";

                number.textContent =
                    String(index + 1);


                const title =
                    document.createElement(
                        "span"
                    );

                title.className =
                    "song-title";

                title.textContent =
                    song.title;


                const deleteButton =
                    document.createElement(
                        "button"
                    );

                deleteButton.type =
                    "button";

                deleteButton.className =
                    "song-delete";

                deleteButton.textContent =
                    "×";


                item.addEventListener(
                    "click",
                    (event) => {

                        if (
                            event.target ===
                            deleteButton
                        ) {
                            return;
                        }

                        selectSong(index);

                    }
                );


                deleteButton.addEventListener(
                    "click",
                    () => {

                        state.serviceSongs
                            .splice(index, 1);


                        if (
                            state.currentSongIndex >=
                            state.serviceSongs.length
                        ) {

                            state.currentSongIndex =
                                state.serviceSongs.length - 1;

                        }


                        renderServiceList();

                        guardarEstadoLocal();

                    }
                );


                item.appendChild(number);

                item.appendChild(title);

                item.appendChild(
                    deleteButton
                );

                list.appendChild(item);

            }
        );

    }


    function selectSong(index) {

        if (
            index < 0 ||
            index >=
            state.serviceSongs.length
        ) {
            return;
        }

        state.currentSongIndex =
            index;

        renderServiceList();

        const song =
            state.serviceSongs[index];

        enviarHolyricsComando(
            "song",
            song
        );

        guardarEstadoLocal();

    }


    function nextSong() {

        if (
            !state.serviceSongs.length
        ) {
            return;
        }

        const next =
            state.currentSongIndex + 1;

        if (
            next >=
            state.serviceSongs.length
        ) {
            return;
        }

        selectSong(next);

    }


    function previousSong() {

        if (
            !state.serviceSongs.length
        ) {
            return;
        }

        const previous =
            state.currentSongIndex - 1;

        if (previous < 0) {
            return;
        }

        selectSong(previous);

    }


    $("btn-add-song")
        ?.addEventListener(
            "click",
            abrirSongModal
        );


    $("close-song-modal")
        ?.addEventListener(
            "click",
            cerrarSongModal
        );


    $("btn-next-song")
        ?.addEventListener(
            "click",
            nextSong
        );


    $("btn-previous-song")
        ?.addEventListener(
            "click",
            previousSong
        );


    $("song-search-input")
        ?.addEventListener(
            "input",
            (event) => {

                const query =
                    event.target.value
                        .trim()
                        .toLowerCase();


                const filtered =
                    holyricsSongs.filter(
                        song =>
                            song
                                .toLowerCase()
                                .includes(query)
                    );


                renderSongResults(
                    filtered
                );

            }
        );


    /* =====================================================
       PADS
    ===================================================== */

    const padElements = {

        kick: $("pad-kick"),

        snare: $("pad-snare"),

        hihat: $("pad-hihat"),

        clap: $("pad-clap"),

        user1: $("pad-user-1"),

        user2: $("pad-user-2"),

        user3: $("pad-user-3"),

        user4: $("pad-user-4")

    };


    function triggerPad(
        padName
    ) {

        const element =
            padElements[padName];

        if (!element) {
            return;
        }

        element.classList.add(
            "active"
        );

        setTimeout(
            () => {

                element.classList.remove(
                    "active"
                );

            },
            100
        );

    }


    Object.entries(
        padElements
    ).forEach(
        ([padName, element]) => {

            if (!element) {
                return;
            }

            element.addEventListener(
                "click",
                () => {

                    triggerPad(
                        padName
                    );

                }
            );


            /*
             * Click derecho sobre USER
             * prepara asignación manual.
             */

            if (
                padName.startsWith(
                    "user"
                )
            ) {

                element.addEventListener(
                    "contextmenu",
                    (event) => {

                        event.preventDefault();

                        const number =
                            Number(
                                padName.replace(
                                    "user",
                                    ""
                                )
                            );


                        const note =
                            prompt(
                                `Nota MIDI para USER ${number}`
                            );


                        if (
                            note === null
                        ) {
                            return;
                        }


                        const midi =
                            Number(note);


                        if (
                            !Number.isInteger(midi) ||
                            midi < 0 ||
                            midi > 127
                        ) {

                            return;

                        }


                        state.userPads[
                            number
                        ] = midi;

                        guardarEstadoLocal();

                    }
                );

            }

        }
    );


    /* =====================================================
       MEMORIAS
    ===================================================== */

    function createMemorySnapshot() {

        return {

            instruments:
                JSON.parse(
                    JSON.stringify(
                        state.instruments
                    )
                ),

            effects:
                JSON.parse(
                    JSON.stringify(
                        state.effects
                    )
                ),

            effectTarget:
                state.effectTarget,

            serviceSongs:
                JSON.parse(
                    JSON.stringify(
                        state.serviceSongs
                    )
                ),

            currentSongIndex:
                state.currentSongIndex,

            userPads:
                JSON.parse(
                    JSON.stringify(
                        state.userPads
                    )
                ),

            midiAssignments:
                JSON.parse(
                    JSON.stringify(
                        state.midiAssignments
                    )
                )

        };

    }


    function saveMemory(number) {

        const snapshot =
            createMemorySnapshot();

        state.memories[number] =
            snapshot;


        try {

            localStorage.setItem(
                `isipad-memory-${number}`,
                JSON.stringify(snapshot)
            );

        } catch (error) {

            console.warn(
                "No se pudo guardar memoria:",
                error
            );

        }

    }


    function loadMemory(number) {

        let snapshot =
            state.memories[number];


        if (!snapshot) {

            try {

                const stored =
                    localStorage.getItem(
                        `isipad-memory-${number}`
                    );

                if (stored) {

                    snapshot =
                        JSON.parse(stored);

                }

            } catch (error) {

                console.warn(
                    "Error leyendo memoria:",
                    error
                );

            }

        }


        if (!snapshot) {
            return;
        }


        state.instruments =
            JSON.parse(
                JSON.stringify(
                    snapshot.instruments || []
                )
            );


        state.effects =
            JSON.parse(
                JSON.stringify(
                    snapshot.effects ||
                    state.effects
                )
            );


        state.effectTarget =
            snapshot.effectTarget ||
            "instruments";


        state.serviceSongs =
            JSON.parse(
                JSON.stringify(
                    snapshot.serviceSongs || []
                )
            );


        state.currentSongIndex =
            Number.isInteger(
                snapshot.currentSongIndex
            )
                ? snapshot.currentSongIndex
                : -1;


        state.userPads =
            JSON.parse(
                JSON.stringify(
                    snapshot.userPads ||
                    state.userPads
                )
            );


        state.midiAssignments =
            JSON.parse(
                JSON.stringify(
                    snapshot.midiAssignments ||
                    state.midiAssignments
                )
            );


        renderActiveInstruments();

        renderServiceList();

        setEffectTarget(
            state.effectTarget
        );

        guardarEstadoLocal();

    }


    $("memory-1")
        ?.addEventListener(
            "click",
            () => {

                if (
                    state.memories[1]
                ) {

                    loadMemory(1);

                } else {

                    saveMemory(1);

                }

            }
        );


    $("memory-2")
        ?.addEventListener(
            "click",
            () => {

                if (
                    state.memories[2]
                ) {

                    loadMemory(2);

                } else {

                    saveMemory(2);

                }

            }
        );


    $("memory-3")
        ?.addEventListener(
            "click",
            () => {

                if (
                    state.memories[3]
                ) {

                    loadMemory(3);

                } else {

                    saveMemory(3);

                }

            }
        );


    /* =====================================================
       AUDIO
    ===================================================== */

    async function solicitarPermisoAudio() {

        /*
         * Necesitamos permiso de micrófono para que
         * algunos navegadores revelen los nombres reales
         * de los dispositivos.
         */

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            return false;

        }


        try {

            const stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: true
                    });


            state.audio.permissionGranted =
                true;


            /*
             * Cerramos este stream temporal.
             * Luego se abre nuevamente la entrada
             * seleccionada si el usuario la elige.
             */

            stream.getTracks().forEach(
                track => track.stop()
            );


            return true;

        } catch (error) {

            console.warn(
                "Permiso de audio no concedido:",
                error
            );

            return false;

        }

    }


    async function enumerateAudioDevices(
        requestPermission = false
    ) {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.enumerateDevices
        ) {

            actualizarEstadoAudio(
                "NAVEGADOR SIN SOPORTE"
            );

            return;

        }


        if (
            requestPermission &&
            !state.audio.permissionGranted
        ) {

            await solicitarPermisoAudio();

        }


        try {

            const devices =
                await navigator.mediaDevices
                    .enumerateDevices();


            const inputs =
                devices.filter(
                    device =>
                        device.kind ===
                        "audioinput"
                );


            const outputs =
                devices.filter(
                    device =>
                        device.kind ===
                        "audiooutput"
                );


            llenarSelectAudio(
                $("audio-input"),
                inputs,
                "SELECCIONAR ENTRADA"
            );


            llenarSelectAudio(
                $("audio-output"),
                outputs,
                "SELECCIONAR SALIDA"
            );


            /*
             * Restauramos selección anterior.
             */

            if (
                state.audio.inputId &&
                inputs.some(
                    d =>
                        d.deviceId ===
                        state.audio.inputId
                )
            ) {

                $("audio-input").value =
                    state.audio.inputId;

            }


            if (
                state.audio.outputId &&
                outputs.some(
                    d =>
                        d.deviceId ===
                        state.audio.outputId
                )
            ) {

                $("audio-output").value =
                    state.audio.outputId;

            }


            actualizarInterfazAudio(
                inputs,
                outputs
            );

        } catch (error) {

            console.error(
                "Error enumerando audio:",
                error
            );

            actualizarEstadoAudio(
                "ERROR DE AUDIO"
            );

        }

    }


    function llenarSelectAudio(
        select,
        devices,
        placeholder
    ) {

        if (!select) {
            return;
        }


        const previous =
            select.value ||
            "";


        select.innerHTML = "";


        const first =
            document.createElement(
                "option"
            );

        first.value = "";

        first.textContent =
            placeholder;

        select.appendChild(first);


        devices.forEach(
            (device, index) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    device.deviceId;


                /*
                 * Algunos navegadores muestran
                 * "Default" o "Communications".
                 */

                let label =
                    device.label;


                if (!label) {

                    label =
                        `DISPOSITIVO ${index + 1}`;

                }


                option.textContent =
                    label;


                select.appendChild(
                    option
                );

            }
        );


        if (
            previous &&
            devices.some(
                d =>
                    d.deviceId ===
                    previous
            )
        ) {

            select.value =
                previous;

        }

    }


    function actualizarInterfazAudio(
        inputs,
        outputs
    ) {

        const interfaceStatus =
            $("audio-interface-status");


        if (interfaceStatus) {

            const hasExternal =
                inputs.some(
                    d =>
                        d.deviceId &&
                        d.deviceId !==
                        "default"
                ) ||
                outputs.some(
                    d =>
                        d.deviceId &&
                        d.deviceId !==
                        "default"
                );


            interfaceStatus.textContent =
                hasExternal
                    ? "DISPOSITIVO DETECTADO"
                    : "DISPOSITIVO INTERNO";

        }

    }


    function actualizarEstadoAudio(
        text
    ) {

        const status =
            $("audio-engine-status");

        if (status) {
            status.textContent =
                text;
        }

    }


    async function seleccionarEntradaAudio(
        deviceId
    ) {

        if (!deviceId) {

            detenerEntradaAudio();

            return;

        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            return;
        }


        detenerEntradaAudio();


        try {

            const stream =
                await navigator.mediaDevices
                    .getUserMedia({

                        audio: {
                            deviceId: {
                                exact: deviceId
                            }
                        }

                    });


            state.audio.inputId =
                deviceId;

            state.audio.inputStream =
                stream;

            state.audio.permissionGranted =
                true;


            /*
             * Creamos AudioContext para comprobar
             * que la entrada está realmente activa.
             */

            if (
                !state.audio.audioContext
            ) {

                state.audio.audioContext =
                    new (
                        window.AudioContext ||
                        window.webkitAudioContext
                    )();

            }


            const context =
                state.audio.audioContext;


            if (
                context.state ===
                "suspended"
            ) {

                await context.resume();

            }


            if (
                state.audio.sourceNode
            ) {

                try {
                    state.audio.sourceNode.disconnect();
                } catch (_) {}

            }


            state.audio.sourceNode =
                context.createMediaStreamSource(
                    stream
                );


            actualizarEstadoAudio(
                "ACTIVO"
            );


            const selected =
                $("audio-input");


            if (selected) {
                selected.value =
                    deviceId;
            }


        } catch (error) {

            console.error(
                "Error de entrada:",
                error
            );

            actualizarEstadoAudio(
                "ERROR DE ENTRADA"
            );

        }

    }


    function detenerEntradaAudio() {

        if (
            state.audio.inputStream
        ) {

            state.audio.inputStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        state.audio.inputStream =
            null;


        if (
            state.audio.sourceNode
        ) {

            try {
                state.audio.sourceNode.disconnect();
            } catch (_) {}

        }


        state.audio.sourceNode =
            null;


        actualizarEstadoAudio(
            "INACTIVO"
        );

    }


    async function seleccionarSalidaAudio(
        deviceId
    ) {

        state.audio.outputId =
            deviceId;


        /*
         * setSinkId está disponible en Chrome
         * y algunos navegadores basados en Chromium.
         */

        if (
            state.audio.audioContext &&
            typeof
            state.audio.audioContext
                .setSinkId ===
            "function"
        ) {

            try {

                await state.audio.audioContext
                    .setSinkId(
                        deviceId
                    );

                state.audio.outputSupported =
                    true;

            } catch (error) {

                console.warn(
                    "No se pudo establecer salida:",
                    error
                );

            }

        }

    }


    $("audio-input")
        ?.addEventListener(
            "change",
            async (event) => {

                await seleccionarEntradaAudio(
                    event.target.value
                );

            }
        );


    $("audio-output")
        ?.addEventListener(
            "change",
            async (event) => {

                await seleccionarSalidaAudio(
                    event.target.value
                );

            }
        );


    if (
        navigator.mediaDevices
    ) {

        navigator.mediaDevices
            .addEventListener?.(
                "devicechange",
                () => {

                    enumerateAudioDevices(
                        false
                    );

                }
            );

    }


    /* =====================================================
       HOLYRICS
    ===================================================== */

    function actualizarEstadoHolyrics(
        connected,
        text
    ) {

        state.holyrics.connected =
            connected;


        const dot =
            $("holyrics-connection-dot");

        const status =
            $("holyrics-connection-status");

        const desktopStatus =
            $("holyrics-desktop-status");


        if (dot) {

            dot.classList.toggle(
                "connected",
                connected
            );

        }


        if (status) {

            status.textContent =
                text;

        }


        if (desktopStatus) {

            desktopStatus.textContent =
                text;

        }

    }


    function guardarDatosHolyrics() {

        const host =
            $("holyrics-host");

        const port =
            $("holyrics-port");

        if (host) {

            state.holyrics.host =
                host.value.trim();

        }

        if (port) {

            state.holyrics.port =
                port.value.trim();

        }

        try {

            localStorage.setItem(
                "isipad-holyrics",
                JSON.stringify(
                    state.holyrics
                )
            );

        } catch (_) {}

    }


    function cargarDatosHolyrics() {

        try {

            const saved =
                localStorage.getItem(
                    "isipad-holyrics"
                );


            if (!saved) {
                return;
            }


            const data =
                JSON.parse(saved);


            if (
                data &&
                typeof data === "object"
            ) {

                state.holyrics.host =
                    data.host || "";

                state.holyrics.port =
                    data.port || "";

            }

        } catch (_) {}


        if ($("holyrics-host")) {

            $("holyrics-host").value =
                state.holyrics.host;

        }


        if ($("holyrics-port")) {

            $("holyrics-port").value =
                state.holyrics.port;

        }

    }


    function mostrarConfiguracionHolyrics(
        show
    ) {

        const advanced =
            $("holyrics-advanced-settings");

        if (!advanced) {
            return;
        }

        advanced.classList.toggle(
            "hidden",
            !show
        );

    }


    function conectarHolyrics() {

        guardarDatosHolyrics();


        const type =
            $("holyrics-connection-select")
                ?.value;


        state.holyrics.connectionType =
            type || "";


        if (!type) {

            actualizarEstadoHolyrics(
                false,
                "SELECCIONA UNA CONEXIÓN"
            );

            return;

        }


        if (
            type === "desktop"
        ) {

            conectarHolyricsDesktop();

        }

    }


    function conectarHolyricsDesktop() {

        const host =
            state.holyrics.host;

        const port =
            state.holyrics.port;


        /*
         * La conexión WebSocket se utiliza cuando
         * el usuario proporciona host y puerto.
         *
         * No inventamos un protocolo HTTP de Holyrics.
         * El navegador solo abre la conexión si el
         * endpoint WebSocket realmente está disponible.
         */

        if (!host || !port) {

            mostrarConfiguracionHolyrics(
                true
            );

            actualizarEstadoHolyrics(
                false,
                "CONFIGURA HOST Y PUERTO"
            );

            return;

        }


        cerrarSocketHolyrics();


        try {

            const url =
                `ws://${host}:${port}`;


            const socket =
                new WebSocket(url);


            state.holyrics.socket =
                socket;


            actualizarEstadoHolyrics(
                false,
                "CONECTANDO..."
            );


            socket.addEventListener(
                "open",
                () => {

                    actualizarEstadoHolyrics(
                        true,
                        "CONECTADO"
                    );

                }
            );


            socket.addEventListener(
                "close",
                () => {

                    if (
                        state.holyrics.socket ===
                        socket
                    ) {

                        state.holyrics.socket =
                            null;

                    }

                    actualizarEstadoHolyrics(
                        false,
                        "DESCONECTADO"
                    );

                }
            );


            socket.addEventListener(
                "error",
                () => {

                    actualizarEstadoHolyrics(
                        false,
                        "ERROR DE CONEXIÓN"
                    );

                }
            );


        } catch (error) {

            console.error(
                "Holyrics:",
                error
            );

            actualizarEstadoHolyrics(
                false,
                "ERROR"
            );

        }

    }


    function cerrarSocketHolyrics() {

        if (
            state.holyrics.socket
        ) {

            try {

                state.holyrics.socket.close();

            } catch (_) {}

        }

        state.holyrics.socket =
            null;

    }


    function desconectarHolyrics() {

        cerrarSocketHolyrics();

        state.holyrics.connected =
            false;

        actualizarEstadoHolyrics(
            false,
            "DESCONECTADO"
        );

    }


    function enviarHolyricsComando(
        type,
        data
    ) {

        const socket =
            state.holyrics.socket;


        if (
            !socket ||
            socket.readyState !==
            WebSocket.OPEN
        ) {

            return false;

        }


        /*
         * Se envía JSON genérico.
         *
         * Esto no altera la interfaz ni
         * las canciones locales.
         */

        try {

            socket.send(
                JSON.stringify({

                    type,

                    data

                })
            );

            return true;

        } catch (error) {

            console.warn(
                "No se pudo enviar a Holyrics:",
                error
            );

            return false;

        }

    }


    $("holyrics-connection-select")
        ?.addEventListener(
            "change",
            (event) => {

                const value =
                    event.target.value;

                if (
                    value === "desktop"
                ) {

                    mostrarConfiguracionHolyrics(
                        true
                    );

                } else {

                    mostrarConfiguracionHolyrics(
                        false
                    );

                }

            }
        );


    $("btn-holyrics-connect")
        ?.addEventListener(
            "click",
            conectarHolyrics
        );


    $("btn-holyrics-disconnect")
        ?.addEventListener(
            "click",
            desconectarHolyrics
        );


    $("holyrics-host")
        ?.addEventListener(
            "change",
            guardarDatosHolyrics
        );


    $("holyrics-port")
        ?.addEventListener(
            "change",
            guardarDatosHolyrics
        );


    /* =====================================================
       CONFIGURACIÓN
    ===================================================== */

    function abrirConfiguracion() {

        const modal =
            $("audio-modal");

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "hidden"
        );

        mostrarPaginaConfiguracion(
            "menu"
        );

    }


    function cerrarConfiguracion() {

        $("audio-modal")
            ?.classList.add(
                "hidden"
            );

    }


    function mostrarPaginaConfiguracion(
        page
    ) {

        const menu =
            $("settings-menu");

        const midi =
            $("settings-midi");

        const audio =
            $("settings-audio");

        const holyrics =
            $("settings-holyrics");


        menu?.classList.toggle(
            "hidden",
            page !== "menu"
        );

        midi?.classList.toggle(
            "hidden",
            page !== "midi"
        );

        audio?.classList.toggle(
            "hidden",
            page !== "audio"
        );

        holyrics?.classList.toggle(
            "hidden",
            page !== "holyrics"
        );


        if (
            page === "midi"
        ) {

            actualizarListaMIDI();

        }


        if (
            page === "audio"
        ) {

            enumerateAudioDevices(
                true
            );

        }


        if (
            page === "holyrics"
        ) {

            cargarDatosHolyrics();

        }

    }


    $("btn-audio-config")
        ?.addEventListener(
            "click",
            abrirConfiguracion
        );


    $("close-audio-modal")
        ?.addEventListener(
            "click",
            cerrarConfiguracion
        );


    $("settings-midi-button")
        ?.addEventListener(
            "click",
            () => {

                mostrarPaginaConfiguracion(
                    "midi"
                );

            }
        );


    $("settings-audio-button")
        ?.addEventListener(
            "click",
            () => {

                mostrarPaginaConfiguracion(
                    "audio"
                );

            }
        );


    $("settings-holyrics-button")
        ?.addEventListener(
            "click",
            () => {

                mostrarPaginaConfiguracion(
                    "holyrics"
                );

            }
        );


    $("settings-midi-back")
        ?.addEventListener(
            "click",
            () => {

                mostrarPaginaConfiguracion(
                    "menu"
                );

            }
        );


    $("settings-audio-back")
        ?.addEventListener(
            "click",
            () => {

                mostrarPaginaConfiguracion(
                    "menu"
                );

            }
        );


    $("settings-holyrics-back")
        ?.addEventListener(
            "click",
            () => {

                mostrarPaginaConfiguracion(
                    "menu"
                );

            }
        );


    /* =====================================================
       MODO CLASE
    ===================================================== */

    $("btn-class-mode")
        ?.addEventListener(
            "click",
            () => {

                if (
                    state.classMode
                ) {

                    cerrarModoClase();

                } else {

                    abrirModoClase();

                }

            }
        );


    $("close-class-mode")
        ?.addEventListener(
            "click",
            cerrarModoClase
        );


    /* =====================================================
       MIDI CONTROL
    ===================================================== */

    $("midi-control")
        ?.addEventListener(
            "click",
            () => {

                /*
                 * Este botón queda reservado
                 * para la sección MIDI CONTROL.
                 */

                console.log(
                    "MIDI CONTROL preparado"
                );

            }
        );


    /* =====================================================
       CLIC FUERA DE MODALES
    ===================================================== */

    [
        "instrument-modal",
        "song-modal",
        "audio-modal"
    ].forEach(
        (modalId) => {

            const modal =
                $(modalId);

            if (!modal) {
                return;
            }

            modal.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        modal
                    ) {

                        modal.classList.add(
                            "hidden"
                        );

                    }

                }
            );

        }
    );


    /* =====================================================
       LOCAL STORAGE
    ===================================================== */

    function guardarEstadoLocal() {

        try {

            localStorage.setItem(
                "isipad-state",
                JSON.stringify({

                    instruments:
                        state.instruments,

                    serviceSongs:
                        state.serviceSongs,

                    currentSongIndex:
                        state.currentSongIndex,

                    userPads:
                        state.userPads,

                    effects:
                        state.effects,

                    effectTarget:
                        state.effectTarget,

                    midiAssignments:
                        state.midiAssignments

                })
            );

        } catch (error) {

            console.warn(
                "No se pudo guardar estado:",
                error
            );

        }

    }


    function cargarEstadoLocal() {

        try {

            const stored =
                localStorage.getItem(
                    "isipad-state"
                );


            if (!stored) {
                return;
            }


            const data =
                JSON.parse(stored);


            if (
                data &&
                typeof data === "object"
            ) {

                if (
                    Array.isArray(
                        data.instruments
                    )
                ) {

                    state.instruments =
                        data.instruments;

                }


                if (
                    Array.isArray(
                        data.serviceSongs
                    )
                ) {

                    state.serviceSongs =
                        data.serviceSongs;

                }


                if (
                    Number.isInteger(
                        data.currentSongIndex
                    )
                ) {

                    state.currentSongIndex =
                        data.currentSongIndex;

                }


                if (
                    data.userPads
                ) {

                    state.userPads =
                        data.userPads;

                }


                if (
                    data.effects
                ) {

                    state.effects =
                        data.effects;

                }


                if (
                    data.effectTarget ===
                    "instruments" ||
                    data.effectTarget ===
                    "drums"
                ) {

                    state.effectTarget =
                        data.effectTarget;

                }


                if (
                    data.midiAssignments
                ) {

                    state.midiAssignments =
                        data.midiAssignments;

                }

            }

        } catch (error) {

            console.warn(
                "Error cargando estado:",
                error
            );

        }

    }


    function cargarMemorias() {

        [1, 2, 3].forEach(
            (number) => {

                try {

                    const stored =
                        localStorage.getItem(
                            `isipad-memory-${number}`
                        );


                    if (stored) {

                        state.memories[number] =
                            JSON.parse(
                                stored
                            );

                    }

                } catch (error) {

                    console.warn(
                        "Error memoria:",
                        error
                    );

                }

            }
        );

    }


    /* =====================================================
       TECLADO FÍSICO — OPCIONAL
       No reemplaza MIDI.
    ===================================================== */

    const computerKeyMap = {

        "a": 48,
        "w": 49,
        "s": 50,
        "e": 51,
        "d": 52,
        "f": 53,
        "t": 54,
        "g": 55,
        "y": 56,
        "h": 57,
        "u": 58,
        "j": 59,
        "k": 60

    };


    const computerKeysDown =
        new Set();


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.repeat
            ) {
                return;
            }


            const target =
                event.target;


            if (
                target instanceof
                    HTMLInputElement ||
                target instanceof
                    HTMLSelectElement ||
                target instanceof
                    HTMLTextAreaElement
            ) {
                return;
            }


            const midi =
                computerKeyMap[
                    event.key.toLowerCase()
                ];


            if (
                midi === undefined
            ) {
                return;
            }


            if (
                computerKeysDown.has(
                    event.key
                )
            ) {
                return;
            }


            computerKeysDown.add(
                event.key
            );


            state.activeNotes.add(
                midi
            );


            actualizarVisualTeclado();

            actualizarPantallaClase();

        }
    );


    document.addEventListener(
        "keyup",
        (event) => {

            const midi =
                computerKeyMap[
                    event.key.toLowerCase()
                ];


            if (
                midi === undefined
            ) {
                return;
            }


            computerKeysDown.delete(
                event.key
            );


            if (
                state.sustainPedal
            ) {

                state.activeNotes.delete(
                    midi
                );

                state.sustainedNotes.add(
                    midi
                );

            } else {

                state.activeNotes.delete(
                    midi
                );

                state.sustainedNotes.delete(
                    midi
                );

            }


            actualizarVisualTeclado();

            actualizarPantallaClase();

        }
    );
    


    /* =====================================================
       ESCAPE
    ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            const openModal =
                document.querySelector(
                    ".modal:not(.hidden)"
                );


            if (openModal) {

                openModal.classList.add(
                    "hidden"
                );

            }

        }
    );


    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */

    function inicializar() {

        cargarEstadoLocal();

        cargarMemorias();

        cargarDatosHolyrics();

        renderActiveInstruments();

        renderServiceList();

        setEffectTarget(
            state.effectTarget
        );

        refreshAllKnobs();

        actualizarPantallaClase();

        iniciarMIDI();

        /*
         * Enumeramos audio inicialmente.
         * Los nombres pueden aparecer después
         * de conceder permiso.
         */

        enumerateAudioDevices(
            false
        );

    }
/* =========================================================
   NAVEGACIÓN MIDI MAPPING
========================================================= */

const btnOpenMidiMapping =
    document.getElementById("btn-open-midi-mapping");

const midiMappingSession =
    document.getElementById("midi-mapping-session");

const mainSession =
    document.getElementById("main-session");

const btnBackToMain =
    document.getElementById("btn-back-to-main");

const btnBackToMainFooter =
    document.getElementById("btn-back-to-main-footer");


/* =========================================================
   ACTUALIZAR DISPOSITIVO MIDI DEL MAPPING
========================================================= */
function actualizarDispositivoMidiMapping() {

    const mappingDeviceName =
        document.getElementById(
            "mapping-device-name"
        );

    const mappingMidiDevice =
        document.getElementById(
            "mapping-midi-device"
        );

    const mappingNoDevice =
        document.getElementById(
            "mapping-no-device"
        );


    if (state.midiInput) {

        const nombre =
            state.midiInput.name ||
            "DISPOSITIVO MIDI";


        if (mappingDeviceName) {

            mappingDeviceName.textContent =
                nombre;

        }


        if (mappingMidiDevice) {

            mappingMidiDevice.textContent =
                nombre;

        }


        if (mappingNoDevice) {

            mappingNoDevice.classList.add(
                "hidden"
            );

        }


        console.log(
            "MIDI MAPPING → dispositivo:",
            nombre
        );

    } else {

        if (mappingDeviceName) {

            mappingDeviceName.textContent =
                "SIN DISPOSITIVO";

        }


        if (mappingMidiDevice) {

            mappingMidiDevice.textContent =
                "SIN DISPOSITIVO";

        }


        if (mappingNoDevice) {

            mappingNoDevice.classList.remove(
                "hidden"
            );

        }

    }

}


/* =========================================================
   ABRIR MIDI MAPPING
========================================================= */

function abrirMidiMapping() {

    console.log(
        "Abriendo MIDI MAPPING..."
    );


    if (!midiMappingSession) {

        console.error(
            "No existe #midi-mapping-session"
        );

        return;
    }


    if (mainSession) {

        mainSession.classList.add(
            "hidden"
        );

    }


    midiMappingSession.classList.remove(
        "hidden"
    );


    actualizarDispositivoMidiMapping();


    console.log(
        "MIDI MAPPING abierto correctamente"
    );

}


function cerrarMidiMapping() {

    if (midiMappingSession) {
        midiMappingSession.classList.add("hidden");
    }

    if (mainSession) {
        mainSession.classList.remove("hidden");
    }

}


/* BOTÓN DE CONFIGURACIÓN → MIDI MAPPING */

if (btnOpenMidiMapping) {

    btnOpenMidiMapping.addEventListener(
        "click",
        abrirMidiMapping
    );

}


/* BOTÓN VOLVER SUPERIOR */

if (btnBackToMain) {

    btnBackToMain.addEventListener(
        "click",
        cerrarMidiMapping
    );

}


/* BOTÓN VOLVER INFERIOR */

if (btnBackToMainFooter) {

    btnBackToMainFooter.addEventListener(
        "click",
        cerrarMidiMapping
    );

}

    inicializar();


});

/* =========================================================
   BOTÓN APRENDER MIDI
========================================================= */

const btnMidiLearn =
    document.getElementById("btn-midi-learn");

const mappingLearnIndicator =
    document.getElementById("mapping-learn-indicator");

const mappingLearnMessage =
    document.getElementById("mapping-learn-message");


let midiMappingLearning = false;


if (btnMidiLearn) {

    btnMidiLearn.addEventListener(
        "click",
        () => {

            midiMappingLearning =
                !midiMappingLearning;


            if (midiMappingLearning) {

                btnMidiLearn.classList.add(
                    "active"
                );

                btnMidiLearn.textContent =
                    "DETENER APRENDIZAJE";


                if (mappingLearnIndicator) {

                    mappingLearnIndicator
                        .classList
                        .add("active");

                }


                if (mappingLearnMessage) {

                    mappingLearnMessage.textContent =
                        "Toca una tecla, pad o control MIDI...";

                }


                console.log(
                    "ISIPad:V → APRENDER MIDI ACTIVADO"
                );


            } else {

                btnMidiLearn.classList.remove(
                    "active"
                );

                btnMidiLearn.textContent =
                    "APRENDER MIDI";


                if (mappingLearnIndicator) {

                    mappingLearnIndicator
                        .classList
                        .remove("active");

                }


                if (mappingLearnMessage) {

                    mappingLearnMessage.textContent =
                        "Aprendizaje MIDI detenido.";

                }


                console.log(
                    "ISIPad:V → APRENDER MIDI DESACTIVADO"
                );

            }

        }
    );

}
