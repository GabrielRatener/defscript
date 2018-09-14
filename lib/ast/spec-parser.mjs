const {min, max} = Math;
const {freeze} = Object;
const gotoStart = 17;
const translations = map({
    '$$$': 17,
    '$__1': 18,
    'spec': 19,
    '$__2': 20,
    'enum-definition': 21,
    'interface-definition': 22,
    '$__3': 23,
    'spec.component': 24,
    'interface-definition.prop': 25,
    '$__4': 26,
    'interface-definition.proplist': 27,
    'interface-definition.e': 28,
    'interface-definition.e.literal': 29,
    'interface-definition.e.union': 30,
    '$': 0,
    'string': 1,
    '|': 2,
    'enum': 3,
    'id': 4,
    '{': 5,
    '}': 6,
    'interface': 7,
    ',': 8,
    '<:': 9,
    ':': 10,
    ';': 11,
    '[': 12,
    ']': 13,
    'null': 14,
    'true': 15,
    'false': 16
});
const productions = [
    [
        17,
        1
    ],
    [
        18,
        0
    ],
    [
        18,
        1
    ],
    [
        18,
        2
    ],
    [
        19,
        1
    ],
    [
        20,
        0
    ],
    [
        20,
        1
    ],
    [
        20,
        3
    ],
    [
        21,
        5
    ],
    [
        22,
        5
    ],
    [
        23,
        0
    ],
    [
        23,
        1
    ],
    [
        23,
        3
    ],
    [
        22,
        7
    ],
    [
        24,
        1
    ],
    [
        24,
        1
    ],
    [
        25,
        4
    ],
    [
        26,
        0
    ],
    [
        26,
        1
    ],
    [
        26,
        2
    ],
    [
        27,
        1
    ],
    [
        28,
        3
    ],
    [
        28,
        3
    ],
    [
        28,
        1
    ],
    [
        28,
        1
    ],
    [
        28,
        1
    ],
    [
        29,
        1
    ],
    [
        29,
        1
    ],
    [
        29,
        1
    ],
    [
        29,
        1
    ],
    [
        30,
        3
    ],
    [
        30,
        3
    ]
];
const reducers = map({
    0: function ($) {
        return $[0];
    },
    1: function ($) {
        return [];
    },
    2: function ($) {
        return [$[0]];
    },
    3: function ($) {
        var slice$ = [].slice;
        return slice$.call($[0]).concat([$[1]]);
    },
    4: function ($) {
        return this.obj($[0]);
    },
    5: function ($) {
        return [];
    },
    6: function ($) {
        return [$[0]];
    },
    7: function ($) {
        var slice$ = [].slice;
        return slice$.call($[0]).concat([$[2]]);
    },
    8: function ($) {
        return [
            $[1],
            {
                kind: 'enum',
                types: $[3].map(function (str) {
                    return str.slice(1, -1);
                })
            }
        ];
    },
    9: function ($) {
        var slice$ = [].slice;
        return [
            $[1],
            {
                kind: 'interface',
                props: this.obj([[
                        'type',
                        $[1]
                    ]].concat(slice$.call($[3]))),
                base: []
            }
        ];
    },
    10: function ($) {
        return [];
    },
    11: function ($) {
        return [$[0]];
    },
    12: function ($) {
        var slice$ = [].slice;
        return slice$.call($[0]).concat([$[2]]);
    },
    13: function ($) {
        var slice$ = [].slice;
        return [
            $[1],
            {
                kind: 'interface',
                props: this.obj([[
                        'type',
                        $[1]
                    ]].concat(slice$.call($[5]))),
                base: $[3]
            }
        ];
    },
    16: function ($) {
        return [
            $[0],
            $[2]
        ];
    },
    17: function ($) {
        return [];
    },
    18: function ($) {
        return [$[0]];
    },
    19: function ($) {
        var slice$ = [].slice;
        return slice$.call($[0]).concat([$[1]]);
    },
    21: function ($) {
        return {
            kind: 'object',
            items: this.obj($[1])
        };
    },
    22: function ($) {
        return {
            kind: 'array',
            base: $[1]
        };
    },
    23: function ($) {
        return this.literal($[0]);
    },
    24: function ($) {
        return {
            kind: 'reference',
            value: $[0]
        };
    },
    25: function ($) {
        return {
            kind: 'union',
            types: $[0]
        };
    },
    30: function ($) {
        return [
            $[0],
            $[2]
        ];
    },
    31: function ($) {
        var slice$ = [].slice;
        return slice$.call($[0]).concat([$[2]]);
    }
}, parseInt);
const lrTable = {
    action: map({
        '0-0': 'r1',
        '0-7': 's5',
        '0-3': 's7',
        '1-0': 'r0',
        '2-0': 'r4',
        '2-7': 's5',
        '2-3': 's7',
        '3-0': 'r2',
        '3-7': 'r2',
        '3-3': 'r2',
        '4-0': 'r14',
        '4-7': 'r14',
        '4-3': 'r14',
        '5-4': 's9',
        '6-0': 'r15',
        '6-7': 'r15',
        '6-3': 'r15',
        '7-4': 's10',
        '8-0': 'r3',
        '8-7': 'r3',
        '8-3': 'r3',
        '9-5': 's11',
        '9-9': 's12',
        '10-5': 's13',
        '11-6': 'r17',
        '11-4': 's17',
        '12-5': 'r10',
        '12-8': 'r10',
        '12-4': 's19',
        '13-6': 'r5',
        '13-2': 'r5',
        '13-1': 's21',
        '14-6': 's22',
        '15-6': 'r20',
        '15-4': 's17',
        '16-6': 'r18',
        '16-4': 'r18',
        '17-10': 's24',
        '18-5': 's25',
        '18-8': 's26',
        '19-5': 'r11',
        '19-8': 'r11',
        '20-6': 's27',
        '20-2': 's28',
        '21-6': 'r6',
        '21-2': 'r6',
        '22-0': 'r9',
        '22-7': 'r9',
        '22-3': 'r9',
        '23-6': 'r19',
        '23-4': 'r19',
        '24-5': 's30',
        '24-12': 's31',
        '24-1': 's33',
        '24-14': 's34',
        '24-15': 's35',
        '24-16': 's36',
        '24-4': 's37',
        '25-6': 'r17',
        '25-4': 's17',
        '26-4': 's40',
        '27-0': 'r8',
        '27-7': 'r8',
        '27-3': 'r8',
        '28-1': 's41',
        '29-11': 's42',
        '29-2': 's43',
        '30-6': 'r17',
        '30-4': 's17',
        '31-5': 's46',
        '31-12': 's47',
        '31-1': 's49',
        '31-14': 's50',
        '31-15': 's51',
        '31-16': 's52',
        '31-4': 's53',
        '32-11': 'r23',
        '32-2': 'r23',
        '33-11': 'r26',
        '33-2': 'r26',
        '34-11': 'r27',
        '34-2': 'r27',
        '35-11': 'r28',
        '35-2': 'r28',
        '36-11': 'r29',
        '36-2': 'r29',
        '37-11': 'r24',
        '37-2': 'r24',
        '38-11': 'r25',
        '38-2': 'r25',
        '39-6': 's56',
        '40-5': 'r12',
        '40-8': 'r12',
        '41-6': 'r7',
        '41-2': 'r7',
        '42-6': 'r16',
        '42-4': 'r16',
        '43-5': 's30',
        '43-12': 's31',
        '43-1': 's33',
        '43-14': 's34',
        '43-15': 's35',
        '43-16': 's36',
        '43-4': 's37',
        '44-6': 's58',
        '45-13': 's59',
        '45-2': 's60',
        '46-6': 'r17',
        '46-4': 's17',
        '47-5': 's46',
        '47-12': 's47',
        '47-1': 's49',
        '47-14': 's50',
        '47-15': 's51',
        '47-16': 's52',
        '47-4': 's53',
        '48-13': 'r23',
        '48-2': 'r23',
        '49-13': 'r26',
        '49-2': 'r26',
        '50-13': 'r27',
        '50-2': 'r27',
        '51-13': 'r28',
        '51-2': 'r28',
        '52-13': 'r29',
        '52-2': 'r29',
        '53-13': 'r24',
        '53-2': 'r24',
        '54-13': 'r25',
        '54-2': 'r25',
        '55-5': 's30',
        '55-12': 's31',
        '55-1': 's33',
        '55-14': 's34',
        '55-15': 's35',
        '55-16': 's36',
        '55-4': 's37',
        '56-0': 'r13',
        '56-7': 'r13',
        '56-3': 'r13',
        '57-11': 'r30',
        '57-2': 's43',
        '58-11': 'r21',
        '58-2': 'r21',
        '59-11': 'r22',
        '59-2': 'r22',
        '60-5': 's46',
        '60-12': 's47',
        '60-1': 's49',
        '60-14': 's50',
        '60-15': 's51',
        '60-16': 's52',
        '60-4': 's53',
        '61-6': 's66',
        '62-13': 's67',
        '62-2': 's60',
        '63-5': 's46',
        '63-12': 's47',
        '63-1': 's49',
        '63-14': 's50',
        '63-15': 's51',
        '63-16': 's52',
        '63-4': 's53',
        '64-2': 'r31',
        '64-11': 'r31',
        '65-13': 'r30',
        '65-2': 's60',
        '66-13': 'r21',
        '66-2': 'r21',
        '67-13': 'r22',
        '67-2': 'r22',
        '68-2': 'r31',
        '68-13': 'r31'
    }),
    goto: map({
        '0-19': 1,
        '0-18': 2,
        '0-24': 3,
        '0-22': 4,
        '0-21': 6,
        '2-24': 8,
        '2-22': 4,
        '2-21': 6,
        '11-27': 14,
        '11-26': 15,
        '11-25': 16,
        '12-23': 18,
        '13-20': 20,
        '15-25': 23,
        '24-28': 29,
        '24-29': 32,
        '24-30': 38,
        '25-27': 39,
        '25-26': 15,
        '25-25': 16,
        '30-27': 44,
        '30-26': 15,
        '30-25': 16,
        '31-28': 45,
        '31-29': 48,
        '31-30': 54,
        '43-28': 57,
        '43-29': 32,
        '43-30': 38,
        '46-27': 61,
        '46-26': 15,
        '46-25': 16,
        '47-28': 62,
        '47-29': 48,
        '47-30': 54,
        '55-28': 64,
        '55-29': 32,
        '55-30': 38,
        '60-28': 65,
        '60-29': 48,
        '60-30': 54,
        '63-28': 68,
        '63-29': 48,
        '63-30': 54
    })
};
function map(obj, kFunc = k => k) {
    const mp = new Map();
    for (let key in obj)
        if (obj.hasOwnProperty(key))
            mp.set(kFunc(key), obj[key]);
    return mp;
}
export function untranslate(n) {
    for (const [key, value] of translations) {
        if (value === n)
            return key;
    }
}
export function accepts(token) {
    return translations.has(token) && translations.get(token) < gotoStart;
}
export const defaults = {};
class ParsingError extends Error {
    constructor(parsing, message = '') {
        super();
        const [type] = this.constructor.name.split('$');
        this.type = type;
        this.message = `${ this.type }: ${ message }`;
        this.parsing = parsing;
        this.loc = parsing.lastPosition;
    }
}
class UnexpectedTokenError extends ParsingError {
    constructor(parsing, token, message = `Unexpected "${ token.type }" token`) {
        super(parsing, message);
        this.loc = parsing._locateToken(token);
        this.token = token;
    }
}
class UnexpectedEndError extends ParsingError {
    constructor(parsing, message = 'Encountered EOF but expected more tokens') {
        super(parsing, message);
    }
}
class InvalidTokenError extends UnexpectedTokenError {
    constructor(parsing, token, message = `Invalid token type: "${ token.type }"`) {
        super(parsing, token, message);
    }
}
export class Parser {
    constructor({
        context = {}
    } = {}) {
        this.context = context;
        this.states = [0];
        this.stack = [];
        this.values = [];
        this.positions = [];
        this.onreducestart = null;
        this.onreduceend = null;
        this.lastPosition = {
            row: 1,
            column: 0
        };
        this.settings = { locate: false };
    }
    _state() {
        return this.states[this.states.length - 1];
    }
    _fire(eventType, data) {
        const fn = this[`on${ eventType }`];
        const internal = true;
        if (typeof fn === 'function') {
            fn.apply(this, [
                data,
                internal
            ]);
        }
    }
    _locate(positions) {
        if (positions.length === 0) {
            return freeze({
                start: this.lastPosition,
                end: this.lastPosition
            });
        } else {
            return freeze({
                start: positions[0],
                end: positions[positions.length - 1]
            });
        }
    }
    _locateToken(token) {
        if (token.loc == null) {
            return freeze({
                start: this.lastPosition,
                end: this.lastPosition
            });
        } else {
            return token.loc;
        }
    }
    _reduce(rule) {
        ;
        const [symbol, length] = productions[rule];
        const nodes = this.values.splice(-length || this.values.length);
        const positions = this.positions.splice(-length || this.positions.length);
        const loc = this._locate(positions);
        this._fire('reducestart', {
            rule,
            nodes,
            positions,
            loc
        });
        if (reducers.has(rule)) {
            const fn = reducers.get(rule);
            this.values.push(fn.apply(this.context, [
                nodes,
                loc,
                rule
            ]));
        } else {
            this.values.push(nodes.length > 0 ? nodes[0] : []);
        }
        this._fire('reduceend', {
            loc,
            rule,
            nodes,
            positions,
            node: this.values.length > 0 ? this.values[this.values.length - 1] : null
        });
        this.states.splice(-length || this.states.length);
        this.states.push(lrTable.goto.get(`${ this._state() }-${ symbol }`));
        this.stack.splice(-length || this.stack.length);
        this.stack.push(symbol);
        this.positions.push(loc);
    }
    addSource(txt) {
        this.source += txt;
    }
    push(token, logger = null) {
        if (!translations.has(token.type) || translations.get(token.type) >= gotoStart)
            throw new InvalidTokenError(this, token);
        else {
            const type = translations.get(token.type);
            while (true) {
                const key = `${ this._state() }-${ type }`;
                if (lrTable.action.has(key)) {
                    const val = lrTable.action.get(key);
                    const action = val[0];
                    const number = parseInt(val.slice(1));
                    if (action === 's') {
                        const loc = this._locateToken(token);
                        this.states.push(number);
                        this.stack.push(type);
                        this.values.push(token.value);
                        this.positions.push(loc);
                        this.lastPosition = loc.end;
                        return;
                    }
                    if (action === 'r') {
                        this._reduce(number);
                        continue;
                    }
                } else {
                    throw new UnexpectedTokenError(this, token);
                }
            }
        }
    }
    finish(logger = null) {
        const type = translations.get('$');
        while (true) {
            const key = `${ this._state() }-${ type }`;
            if (lrTable.action.has(key)) {
                const val = lrTable.action.get(key);
                const action = val[0];
                const number = parseInt(val.slice(1));
                if (action !== 'r')
                    throw new UnexpectedEndError(this);
                if (number === 0)
                    return this.values[0];
                else {
                    this._reduce(number);
                    continue;
                }
            } else {
                throw new UnexpectedEndError(this);
            }
        }
    }
}
