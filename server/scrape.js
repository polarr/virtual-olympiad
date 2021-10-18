import * as cheerio from 'cheerio';
import got from 'got';

const tests = [
    {
        name: "AMC_8",
        type: 'choice',
        yearRange: [1999, 2021],
        problemRange: [1, 26],
        difficulty: {
            breakpoints: [[1, 0.8], [13, 1.3], [26, 1.7]],
            year: 0.02
        }
    },
    {
        name: "AMC_10",
        type: 'choice',
        modifiers: ["A", "B"],
        yearRange: [2002, 2021],
        problemRange: [1, 26],
        difficulty: {
            breakpoints: [[1, 1], [6, 2], [21, 3], [26, 3.5]],
            year: 0.015
        }
    },
    {
        name: "AMC_12",
        type: 'choice',
        modifiers: ["A", "B"],
        yearRange: [2002, 2021],
        problemRange: [1, 26],
        difficulty: {
            breakpoints: [[1, 1.8], [11, 3], [21, 4], [26, 4.5]],
            year: 0.02
        }
    },
    {
        name: "AIME_",
        type: 'answer',
        modifiers: ["I", "II"],
        yearRange: [2000, 2021],
        problemRange: [1, 16],
        difficulty: {
            breakpoints: [[1, 3], [6, 4], [10, 5], [12, 6], [16, 6]],
            year: 0.025
        }
    }
];

function isInt(str) {
    return !isNaN(str) && !isNaN(parseFloat(str)) && Number.isInteger(parseFloat(str, 10));
}

function randomInt(min, max) {
    return min + Math.floor((max - min) * Math.random());
}

function lerp(x1, x2, y1, y2, a){
    return y1 + (a - x1) * (y2 - y1)/(x2 - x1);
}

function problemDifficulty(t, year, problem) {
    let test = tests[t];
    let diff;
    for (let i = 1; i < test.difficulty.breakpoints.length; ++i){
        const n = test.difficulty.breakpoints;
        if (problem < n[i][0]){
            diff = lerp(n[i - 1][0], n[i][0], n[i - 1][1], n[i][1], problem);
            break;
        }
    }

    diff -= Math.max(0, tests[t].yearRange[1] - year - 1) * test.difficulty.year;
    return diff;
}

function generateProblem(t, check) {
    let test = tests[t];

    let ans = {
        test: test.name + (test.modifiers ? test.modifiers[randomInt(0, test.modifiers.length)] : ""),
        year: randomInt(test.yearRange[0], test.yearRange[1]),
        problem: randomInt(test.problemRange[0], test.problemRange[1]),
        difficulty: null
    };
    ans.difficulty = problemDifficulty(t, ans.year, ans.problem)

    return check.includes(ans) ? generateProblem(t, check) : ans;
}

async function scrapeProblem({test, year, problem, difficulty}) {
    const url = `https://artofproblemsolving.com/wiki/index.php/${year}_${test}`;
    try {
        const [{ body: problemSrc }, { body: answerSrc }] = await Promise.all([got(url + "_Problems"), got(url + "_Answer_Key")]);

        let $ = cheerio.load(problemSrc);
        const p = Object.entries($(`h2:has(span[id="Problem_${problem}"])`).nextUntil('p:has(a:contains("Solution")), h2')).map(el => {
            if (!isInt(el[0])){
                return '';
            }
            let element = $(el[1]);
            return `<${element['0'].name}>${element.html()}</${element['0'].name}>`;
        }).join('');

        $ = cheerio.load(answerSrc);
        const answer = $(`div[class="mw-parser-output"] > ol > li:eq(${problem - 1})`).text();

        return {
            name: `${year} ${test} Problem ${problem}`.replace(/_/g, ' '),
            link: url + `_Problems/Problem_${problem}`,
            problem: p,
            answer: answer.toUpperCase().replace(/^0+(?=\d)/, ''),
            difficulty: difficulty
        };
    } catch (error) {
        console.error(error);
        return 0;
    }
}

async function fetchProblems(count, t, sortExam) {
    let problems = [];
    let problemCount = [];
    let a = [];

    let flooredAverage = Math.floor(count/t.length);
    let remaining = count - t.length * flooredAverage;
    for (let i = 0; i < t.length; ++i){
        problemCount[i] = flooredAverage;
        a[i] = randomInt(0, remaining + 1);
    }

    a.sort();
    problemCount[0] += a[0];
    for (let i = 1; i < t.length; ++i){
        problemCount[i] += a[i] - a[i - 1];
    }

    for (let i = 0; i < t.length; ++i) {
        for (let x = 0; x < problemCount[i]; ++x) {
            problems.push(generateProblem(t[i], problems));
        }
    }

    if (sortExam){
        problems.sort((a, b) => a.difficulty - b.difficulty);
    }

    let problemsPromise = [];
    for (let i = 0; i < problems.length; ++i) {
        problemsPromise.push(scrapeProblem(problems[i]));
    }
    return await Promise.all(problemsPromise);
}

export {tests, fetchProblems};
