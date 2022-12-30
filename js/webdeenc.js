'use strict';

const statusOutput = document.getElementById('status');
const resultOutput = document.getElementById('result');
const progressBar = document.getElementById('progress');
const sourceInput = document.getElementById('source');
const enctypeSelect = document.getElementById('enctype');
const convertButton = document.getElementById('convert');
const downloadButton = document.getElementById('download');
const dropareaDiv = document.getElementById('droparea');
const droptextPara = document.getElementById('droptext');

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: false });

const msgv = {
	'ここに': 'ここにファイルをドロップするか<br>↓選択してください↓',
	'動画フ': '<span class="strong">動画ファイルか音声ファイルにしてね!</span>',
	'来い!' : '<span class="strong">来い!</span>',
	'それは': '<span class="strong">それはできない!</span>',
	'変換秒': '変換しています (残り @@ 秒くらい)',
	'変換分': '変換しています (残り @@ 分くらい)',
};

let dragoverFlag = false;

const mimeof = (ext) => {
	const table = {
	// video
		mp4  : 'video/mp4',
		mkv  : 'video/x-matroska',
		webm : 'video/webm',
		mov  : 'video/quicktime',
		mpg  : 'video/mpeg',
	// audio
		mp3  : 'audio/mp3',
		ogg  : 'audio/ogg',
		m4a  : 'audio/mpeg',
		flac : 'audio/flac',
		wav  : 'audio/x-wav',
	};
	return table[ext] || 'application/octet-stream';
}

async function dotTimer(str) {
	if (!this.cnt) this.cnt = 0;
	this.cnt++;
	statusOutput.textContent = str;
	for (let i = 0; i < this.cnt; i++) statusOutput.textContent += '.';
	this.cnt %= 5;
}

let prepTimerID = null, convTimerID = null;

const convert = async () => {
	try {
		const files = sourceInput.files;
		const { name } = files[0];

		prepTimerID = setInterval(dotTimer, 500, '変換する準備をしています');
		if (!ffmpeg.isLoaded()) await ffmpeg.load();
		clearInterval(prepTimerID);

		ffmpeg.FS('writeFile', 'input', await fetchFile(files[0]));

		const outputExt = enctypeSelect.value;
		const outputName = 'output.' + outputExt;
		const ba1 = document.forms.baform.ba.value === 'none' ? '' : '-b:a';
		const ba2 = document.forms.baform.ba.value === 'none' ? '' :
			document.forms.baform.baval.value;
		const bv1 = document.forms.bvform.bv.value === 'none' ? '' : '-b:v';
		const bv2 = document.forms.bvform.bv.value === 'none' ? '' :
			document.forms.bvform.bvval.value;
		const ss1 = document.forms.sstoform.ss.value === 'none' ? '' : '-ss';
		const ss2 = document.forms.sstoform.ss.value === 'none' ? '' :
			document.forms.sstoform.ssval.value;
		const to1 = document.forms.sstoform.to.value === 'none' ? '' : '-to';
		const to2 = document.forms.sstoform.to.value === 'none' ? '' :
			document.forms.sstoform.toval.value;

		let cnt = 0, ret, prev = null;
		const procStart = window.performance.now();
		const ffmpegPromise = ffmpeg.run('-i', 'input',
			~mimeof(outputExt).indexOf('audio') ? '-vn' : '',
			ba1, ba2, bv1, bv2,
			ss1, ss2, to1, to2,
			outputName);
		ffmpeg.setProgress(({ ratio }) => ret = ratio);

		convTimerID = setInterval(() => {
			if (prev === ret) return;
			prev = ret;
			const now = window.performance.now();
			const t = (now - procStart) / 1e3;
			const rem = Math.ceil(t / ret - t);
			progressBar.value = ret || 0;
			if (cnt++ < 3) return statusOutput.textContent = '変換しています';
			statusOutput.textContent =
				rem / 100 < 1 ? msgv['変換秒'].replace(/@@/, rem) :
					msgv['変換分'].replace(/@@/, Math.floor(rem / 60));
		});

		await ffmpegPromise;

		clearInterval(convTimerID);
		progressBar.value = 1;
		statusOutput.textContent = '変換が完了しました';
		const data = ffmpeg.FS('readFile', outputName);

		resultOutput.src = URL.createObjectURL(
			new Blob([data.buffer], { type: mimeof(outputExt) }));
	} catch (error) {
		clearInterval(prepTimerID);
		clearInterval(convTimerID);
		statusOutput.textContent = 'エラー:' + error;
	}
}

convertButton.addEventListener('click', async () => {
	convertButton.disabled = true;
	enctypeSelect.disabled = true;
	sourceInput.value !== '' && await convert();
	convertButton.disabled = false;
	enctypeSelect.disabled = false;
});

downloadButton.addEventListener('click', () => {
	const a = document.createElement('a');
	a.href = resultOutput.src;
	a.download = sourceInput.files[0].name.replace(/\..*$/, '.' + enctypeSelect.value);
	a.click();
});

dropareaDiv.addEventListener('drop', e => {
	e.preventDefault(); e.stopPropagation();
	droptextPara.innerHTML = msgv['ここに'];
	dragoverFlag = false;
	if (~e.dataTransfer.types[0].toLowerCase().indexOf('file')) {
		if (/^(video|audio)\/.*/.test(e.dataTransfer.files[0].type))
			sourceInput.files = e.dataTransfer.files;
		else
			droptextPara.innerHTML = msgv['動画フ'],
				setTimeout(() => droptextPara.innerHTML = msgv['ここに'], 1000);
	} else {
		droptextPara.innerHTML = msgv['それは'],
			setTimeout(() => droptextPara.innerHTML = msgv['ここに'], 1000);
	}
});

dropareaDiv.addEventListener('dragleave', e => { 
	e.preventDefault(); e.stopPropagation();
	droptextPara.innerHTML = msgv['ここに'];
	dragoverFlag = false;
});

let hoge;
dropareaDiv.addEventListener('dragover', e => {
	e.preventDefault(); e.stopPropagation();
	hoge = e.dataTransfer;
	if (!dragoverFlag)
		droptextPara.innerHTML = ~e.dataTransfer.types[0].toLowerCase().indexOf('file') ?
			msgv['来い!'] : msgv['それは'];
	dragoverFlag = true;
});
