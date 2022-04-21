function parseCSV(csv) {
	let data = csv.trim().split('\n').map(function(row) {
		return row.split(';');
	});
	let header = data.shift();
	return [header, data];
}

// inclusive
function randint(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function insertRandom(arr, el) {
	let n = randint(0, arr.length);
	arr.splice(n, 0, el);
}

function shuffle(arr) {
	arr = [...arr];
	for (var i = arr.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
	return arr;
}

const alphabetEl = document.querySelector('.alphabet');
const testEl = document.querySelector('.test');
var header;
var data;

function getCell(row, name) {
	return row[header.indexOf(name)];
}

function getData(letter, name) {
	for (let row of data) {
		if (getCell(row, 'letter') == letter) return getCell(row, name);
	}
}

function updateAlphabet(save = true) {
	var sorted = [...data];
	// sort frequency
	if (document.querySelector('input[name=sort]:checked').value == 'freq') {
		sorted.sort(function(a, b) {
			return Number(getCell(b, 'freq')) - Number(getCell(a, 'freq'));
		});
	}

	alphabetEl.innerHTML = '';
	for (let row of sorted) {
		let letter = getCell(row, 'letter');
		let lower = getCell(row, 'lower');
		let cyrillic = getCell(row, 'cyrillic');
		let latin = getCell(row, 'translit');
		let extra = getCell(row, 'extra');
		let sel = selected.has(letter) ? 'selected' : '';
		alphabetEl.innerHTML += 
			`<div onclick="select(event)" class="letter ${sel} ${extra}" data-letter="${letter}">
				<div class=upper>${letter}</div>
				<div class=lower>${lower}</div>
				<div class=latin>${latin}</div>
				<div class=cyrillic>${cyrillic}</div>
			</div>`
	}

	if (save) saveState();
}

let translitCell;

function update(save = true) {
	document.body.classList.toggle('show-upper', document.querySelector('input[name=upper]:checked'));
	document.body.classList.toggle('show-lower', document.querySelector('input[name=lower]:checked'));

	document.body.classList.toggle('show-latin', document.querySelector('input[value=latin]:checked'));
	document.body.classList.toggle('show-cyrillic', document.querySelector('input[value=cyrillic]:checked'));

	translitCell = document.querySelector('input[name=translit]:checked').value;
	if (translitCell == 'latin') translitCell = 'translit';

	if (save) saveState();
}

update(false);

function updateTrainTitle() {
	document.getElementById('train-btn').innerText = selected.size ?
		'Train selected' : 'Train!';
	document.getElementById('none-btn').style.display = selected.size ? 'block' : 'none';
}

let selected = new Set();

function select(e) {
	let letter = e.currentTarget.getAttribute('data-letter');
	if (selected.has(letter)) {
		selected.delete(letter);
		e.currentTarget.classList.remove('selected');
	} else {
		selected.add(letter);
		e.currentTarget.classList.add('selected');
	}

	saveState();
	updateTrainTitle();
}

function selectNone() {
	selected.clear();
	for (let el of document.querySelectorAll('.letter')) el.classList.remove('selected');
	saveState();
	updateTrainTitle();
}

function saveState() {
	let state = {
		sort: document.querySelector('input[name=sort]:checked').value,
		translit: document.querySelector('input[name=translit]:checked').value,
		upper: Boolean(document.querySelector('input[name=upper]:checked')),
		lower: Boolean(document.querySelector('input[name=lower]:checked')),
		selected: Array.from(selected)
	};
	localStorage['state'] = JSON.stringify(state);
}

function loadState() {
	if (!localStorage['state']) return;
	let state = JSON.parse(localStorage['state']);
	selected = new Set(state.selected);
	document.querySelector(`input[name=translit][value=${state.translit}]`).checked = true;
	document.querySelector(`input[name=sort][value=${state.sort}]`).checked = true;
	document.querySelector('input[name=upper]').checked = state.upper;
	document.querySelector('input[name=lower]').checked = state.lower;
	update(false);
	updateTrainTitle();
}

const MAX_QUESTIONS = 15;
const CHOICES = 5;

let questions;
let question;
let points;

function runTest() {
	document.body.classList.add('testing');
	let selected = document.querySelectorAll('.letter.selected');
	if (selected.length == 0) {
		selected = document.querySelectorAll('.letter');
	}

	questions = [...selected].map(el => el.getAttribute('data-letter'));
	questions = shuffle(questions).slice(0, MAX_QUESTIONS);

	question = 0;
	points = 0;
	nextQuestion();
}

function finishTest() {
	testEl.innerHTML = `
		<div class="title">Correct answers:</div>
		<div class="count"><span class="points">${points}</span> of ${questions.length}</div>
		<button onclick="closeTest()">OK</button>`;
}

function closeTest() {
	document.body.classList.remove('testing');
}

function nextQuestion() {
	let letter = getData(questions[question], 'letter');
	let lower = getData(questions[question], 'lower');

	let choices = [];
	while (choices.length < CHOICES) {
		let choice = randint(0, data.length - 1);
		if (getData(questions[question], 'letter') == getCell(data[choice], 'letter')) continue;
		if (choices.includes(choice)) continue;
		choices.push(getCell(data[choice], translitCell));
	}
	insertRandom(choices, getData(questions[question], translitCell));

	let choicesHTML = '';
	for (let choice of choices) {
		choicesHTML += `<div class="choice" onclick="input(event)" data-answer="${choice}">${choice}</div>`;
	}
	testEl.innerHTML = `
		<button class="close" onclick="closeTest()">╳</button>
		<div class="counter">${question + 1} of ${questions.length}</div>
		<div class="title">Choose correct transliteration:</div>
		<div class="upper">${letter}</div>
		<div class="lower">${lower}</div>
		<div class="choices">${choicesHTML}</div>`;

	question++;
}

function input(e) {
	if (document.querySelector('.choice.correct')) return; // already answered

	let answer = e.currentTarget.getAttribute('data-answer');

	let correct = getData(questions[question - 1], translitCell);
	if (answer == correct) {
		points++;
		e.currentTarget.classList.add('correct');
	} else {
		e.currentTarget.classList.add('incorrect');
		document.querySelector(`.choice[data-answer="${correct}"]`).classList.add('correct');
	}

	setTimeout(function() {
		if (question == questions.length) { 
			finishTest();
		} else {
			nextQuestion();
		}
	}, answer == correct ? 200 : 2000);
}

fetch('armenian.csv')
	.then(response => response.text())
	.then(text => {
		[header, data] = parseCSV(text);

		loadState();
		updateAlphabet(false);
		loadState();
	});
