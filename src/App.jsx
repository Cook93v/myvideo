import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Play,
  Copy,
  Download,
  Wand2,
  Video,
  Loader2,
  Image as ImageIcon,
  Layers3,
  MoveUp,
  MoveDown,
  RotateCcw,
  Save,
} from 'lucide-react';

const themes = {
  neon: {
    name: 'Néon',
    pageBackground: 'linear-gradient(135deg, #d946ef 0%, #7c3aed 50%, #3730a3 100%)',
    colors: ['#c026d3', '#7c3aed', '#3730a3'],
    answerBg: '#fde047',
    answerText: '#111111',
  },
  dark: {
    name: 'Dark Pro',
    pageBackground: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #000000 100%)',
    colors: ['#18181b', '#27272a', '#000000'],
    answerBg: '#86efac',
    answerText: '#111111',
  },
  candy: {
    name: 'Candy',
    pageBackground: 'linear-gradient(135deg, #f472b6 0%, #fb7185 50%, #fdba74 100%)',
    colors: ['#f472b6', '#fb7185', '#fdba74'],
    answerBg: '#ffffff',
    answerText: '#db2777',
  },
};

const createQuestion = (id, name = 'Nouvelle question') => ({
  id,
  type: 'question',
  title: name,
  hook: 'Trouve avant la fin 😱',
  question: 'Écris ta question ici',
  answer: 'Bonne réponse',
  options: ['Choix 1', 'Choix 2', 'Choix 3'],
  duration: 7,
  answerDuration: 1.2,
  showChoices: true,
  showProgressBar: true,
  autoReveal: true,
  backgroundType: 'theme',
  backgroundColor: '#111827',
  backgroundImage: '',
  overlayOpacity: 0.2,
  textColor: '#ffffff',
  answerBg: '#fde047',
  answerText: '#111111',
});

const createIntro = (id) => ({
  id,
  type: 'intro',
  title: 'Intro',
  text: 'Seuls les plus forts vont tout trouver 🔥',
  duration: 2,
  backgroundType: 'theme',
  backgroundColor: '#7c3aed',
  backgroundImage: '',
  overlayOpacity: 0.2,
  textColor: '#ffffff',
});

const createOutro = (id) => ({
  id,
  type: 'outro',
  title: 'Fin',
  text: 'Abonne-toi pour la partie 2 !',
  duration: 2,
  backgroundType: 'theme',
  backgroundColor: '#111111',
  backgroundImage: '',
  overlayOpacity: 0.2,
  textColor: '#ffffff',
});

const defaultProject = {
  title: 'Quiz TikTok #1',
  theme: 'neon',
  watermark: '@toncompte',
  voiceStyle: 'Dynamique',
  musicStyle: 'Énergique',
};

const defaultSequences = [
  createIntro(1),
  {
    ...createQuestion(2, 'Question 1'),
    question: 'Quel animal dort le moins ?',
    answer: 'La girafe',
    options: ['Le lion', 'La girafe', 'Le chat'],
  },
  {
    ...createQuestion(3, 'Question 2'),
    question: 'Quel est le plus grand océan ?',
    answer: "L'océan Pacifique",
    options: ['Atlantique', 'Pacifique', 'Indien'],
  },
  createOutro(4),
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(' ');
  let line = '';
  const lines = [];

  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = `${words[i]} `;
    } else {
      line = testLine;
    }
  }

  lines.push(line.trim());
  lines.forEach((currentLine, index) => {
    ctx.fillText(currentLine, x, y + index * lineHeight);
  });
  return lines.length;
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function blobToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function SmallButton({ children, onClick, secondary = false, danger = false, disabled = false }) {
  let className = 'btn';
  if (secondary) className += ' btn-secondary';
  if (danger) className += ' btn-danger';
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function App() {
  const [project, setProject] = useState(() => {
    const saved = localStorage.getItem('quiz-maker-project');
    return saved ? JSON.parse(saved) : defaultProject;
  });
  const [sequences, setSequences] = useState(() => {
    const saved = localStorage.getItem('quiz-maker-sequences');
    return saved ? JSON.parse(saved) : defaultSequences;
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('project');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationText, setGenerationText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewIntervalRef = useRef(null);

  const activeTheme = themes[project.theme] || themes.neon;
  const current = sequences[selectedIndex] || sequences[0];

  useEffect(() => {
    localStorage.setItem('quiz-maker-project', JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    localStorage.setItem('quiz-maker-sequences', JSON.stringify(sequences));
  }, [sequences]);

  useEffect(() => () => {
    if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
  }, []);

  const updateProject = (key, value) => {
    setProject((prev) => ({ ...prev, [key]: value }));
  };

  const updateSequence = (index, key, value) => {
    setSequences((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const updateOption = (sequenceIndex, optionIndex, value) => {
    setSequences((prev) =>
      prev.map((item, i) =>
        i === sequenceIndex
          ? { ...item, options: item.options.map((opt, oi) => (oi === optionIndex ? value : opt)) }
          : item
      )
    );
  };

  const addQuestion = () => {
    const number = sequences.filter((s) => s.type === 'question').length + 1;
    const newItem = createQuestion(Date.now(), `Question ${number}`);
    setSequences((prev) => [...prev, newItem]);
    setSelectedIndex(sequences.length);
    setActiveTab('edit');
  };

  const addIntro = () => {
    const newItem = createIntro(Date.now());
    setSequences((prev) => [newItem, ...prev]);
    setSelectedIndex(0);
    setActiveTab('edit');
  };

  const addOutro = () => {
    const newItem = createOutro(Date.now());
    setSequences((prev) => [...prev, newItem]);
    setSelectedIndex(sequences.length);
    setActiveTab('edit');
  };

  const removeSequence = (index) => {
    if (sequences.length === 1) return;
    const next = sequences.filter((_, i) => i !== index);
    setSequences(next);
    setSelectedIndex(Math.max(0, index - 1));
  };

  const duplicateSequence = () => {
    const clone = structuredClone(current);
    clone.id = Date.now();
    clone.title = `${current.title} (copie)`;
    const next = [...sequences];
    next.splice(selectedIndex + 1, 0, clone);
    setSequences(next);
    setSelectedIndex(selectedIndex + 1);
  };

  const moveSequence = (direction) => {
    const newIndex = direction === 'up' ? selectedIndex - 1 : selectedIndex + 1;
    if (newIndex < 0 || newIndex >= sequences.length) return;
    const next = [...sequences];
    [next[selectedIndex], next[newIndex]] = [next[newIndex], next[selectedIndex]];
    setSequences(next);
    setSelectedIndex(newIndex);
  };

  const resetBackground = () => {
    updateSequence(selectedIndex, 'backgroundType', 'theme');
    updateSequence(selectedIndex, 'backgroundImage', '');
    updateSequence(selectedIndex, 'backgroundColor', '#111827');
  };

  const resetAll = () => {
    setProject(defaultProject);
    setSequences(defaultSequences);
    setSelectedIndex(0);
    setActiveTab('project');
    setDownloadUrl('');
    setGenerationText('');
  };

  const handleBackgroundUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await blobToDataURL(file);
    updateSequence(selectedIndex, 'backgroundType', 'image');
    updateSequence(selectedIndex, 'backgroundImage', dataUrl);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ project, sequences }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(project.title || 'quiz').replace(/\s+/g, '-').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed.project) setProject(parsed.project);
    if (Array.isArray(parsed.sequences) && parsed.sequences.length > 0) {
      setSequences(parsed.sequences);
      setSelectedIndex(0);
    }
  };

  const copyScript = async () => {
    const value = script;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const script = useMemo(() => {
    return [
      `TITRE : ${project.title}`,
      `WATERMARK : ${project.watermark}`,
      `VOIX : ${project.voiceStyle}`,
      `MUSIQUE : ${project.musicStyle}`,
      '',
      ...sequences.flatMap((item, i) => {
        if (item.type === 'question') {
          return [
            `SÉQUENCE ${i + 1} : QUESTION`,
            `NOM : ${item.title}`,
            `HOOK : ${item.hook}`,
            `QUESTION : ${item.question}`,
            `CHOIX : ${item.options.join(' | ')}`,
            `RÉPONSE : ${item.answer}`,
            `DURÉE : ${item.duration}s`,
            '',
          ];
        }
        return [
          `SÉQUENCE ${i + 1} : ${item.type.toUpperCase()}`,
          `NOM : ${item.title}`,
          `TEXTE : ${item.text}`,
          `DURÉE : ${item.duration}s`,
          '',
        ];
      }),
    ].join('\n');
  }, [project, sequences]);

  const drawBackground = async (ctx, sequence, theme) => {
    const { width, height } = ctx.canvas;

    if (sequence.backgroundType === 'image' && sequence.backgroundImage) {
      try {
        const img = await loadImage(sequence.backgroundImage);
        ctx.drawImage(img, 0, 0, width, height);
      } catch {
        ctx.fillStyle = sequence.backgroundColor || '#111827';
        ctx.fillRect(0, 0, width, height);
      }
    } else if (sequence.backgroundType === 'color') {
      ctx.fillStyle = sequence.backgroundColor || '#111827';
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, theme.colors[0]);
      gradient.addColorStop(0.5, theme.colors[1]);
      gradient.addColorStop(1, theme.colors[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = `rgba(0,0,0,${Number(sequence.overlayOpacity ?? 0.2)})`;
    ctx.fillRect(0, 0, width, height);
  };

  const drawQuestionFrame = async (ctx, sequence, sequenceIndex, totalQuestions, secondsLeft, progressValue, showAnswer) => {
    const { width, height } = ctx.canvas;
    await drawBackground(ctx, sequence, activeTheme);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(project.watermark || '@toncompte', 34, 48);
    ctx.textAlign = 'right';
    ctx.fillText(`${sequenceIndex + 1}/${totalQuestions}`, width - 34, 48);
    ctx.textAlign = 'left';

    drawRoundedRect(ctx, 35, 80, width - 70, 46, 22, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = sequence.textColor || '#ffffff';
    ctx.font = 'bold 20px Arial';
    wrapText(ctx, sequence.hook, 55, 110, width - 110, 24);

    ctx.textAlign = 'center';
    ctx.fillStyle = sequence.textColor || '#ffffff';
    ctx.font = 'bold 42px Arial';
    const lines = wrapText(ctx, sequence.question, width / 2, 240, width - 100, 52);
    let currentY = 240 + lines * 52 + 34;

    if (sequence.showChoices) {
      ctx.font = 'bold 26px Arial';
      sequence.options.forEach((opt) => {
        drawRoundedRect(ctx, 60, currentY, width - 120, 58, 20, 'rgba(255,255,255,0.14)');
        ctx.fillStyle = sequence.textColor || '#ffffff';
        wrapText(ctx, opt, width / 2, currentY + 36, width - 160, 30);
        currentY += 74;
      });
    }

    drawRoundedRect(ctx, width / 2 - 52, currentY + 10, 104, 104, 52, '#ffffff');
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 50px Arial';
    ctx.fillText(String(secondsLeft), width / 2, currentY + 77);

    if (sequence.showProgressBar) {
      drawRoundedRect(ctx, 60, currentY + 140, width - 120, 20, 10, 'rgba(255,255,255,0.2)');
      drawRoundedRect(ctx, 60, currentY + 140, (width - 120) * progressValue, 20, 10, '#ffffff');
    }

    if (showAnswer && sequence.autoReveal) {
      drawRoundedRect(ctx, 50, height - 205, width - 100, 88, 24, sequence.answerBg || activeTheme.answerBg);
      ctx.fillStyle = sequence.answerText || activeTheme.answerText;
      ctx.font = 'bold 30px Arial';
      wrapText(ctx, `Réponse : ${sequence.answer}`, width / 2, height - 150, width - 150, 34);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(sequence.title || 'Question', width / 2, height - 45);
    ctx.textAlign = 'left';
  };

  const drawTextFrame = async (ctx, sequence, smallText) => {
    const { width, height } = ctx.canvas;
    await drawBackground(ctx, sequence, activeTheme);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(project.watermark || '@toncompte', 34, 48);

    ctx.textAlign = 'center';
    ctx.fillStyle = sequence.textColor || '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(smallText, width / 2, 140);

    ctx.font = 'bold 48px Arial';
    wrapText(ctx, sequence.text, width / 2, 380, width - 100, 56);

    ctx.font = 'bold 22px Arial';
    ctx.fillText(sequence.title, width / 2, height - 55);
    ctx.textAlign = 'left';
  };

  const generateVideo = async () => {
    if (typeof window === 'undefined' || !window.MediaRecorder) {
      alert('Ton navigateur ne sait pas créer la vidéo ici.');
      return;
    }

    setIsGenerating(true);
    setGenerationText('Préparation de la vidéo...');
    setDownloadUrl('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      recorder.start();
      const questionCount = sequences.filter((item) => item.type === 'question').length;
      let questionOrder = 0;

      for (let i = 0; i < sequences.length; i += 1) {
        const item = sequences[i];

        if (item.type === 'intro') {
          setGenerationText("Création de l'intro...");
          await drawTextFrame(ctx, item, 'INTRO');
          await wait(item.duration * 1000);
          continue;
        }

        if (item.type === 'outro') {
          setGenerationText('Création de la fin...');
          await drawTextFrame(ctx, item, 'FIN');
          await wait(item.duration * 1000);
          continue;
        }

        questionOrder += 1;
        for (let second = item.duration; second >= 1; second -= 1) {
          setGenerationText(`Création de la question ${questionOrder}/${questionCount}...`);
          await drawQuestionFrame(ctx, item, questionOrder - 1, questionCount, second, second / item.duration, false);
          await wait(1000);
        }

        if (item.autoReveal) {
          setGenerationText(`Ajout de la réponse ${questionOrder}/${questionCount}...`);
          await drawQuestionFrame(ctx, item, questionOrder - 1, questionCount, 0, 0, true);
          await wait((item.answerDuration || 1.2) * 1000);
        }
      }

      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setGenerationText('Vidéo prête !');
    } catch (error) {
      console.error(error);
      alert('Erreur pendant la création de la vidéo.');
      setGenerationText('Erreur.');
    } finally {
      setIsGenerating(false);
    }
  };

  const playSimplePreview = () => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }

    setPreviewPlaying(true);
    let index = 0;
    setSelectedIndex(0);

    previewIntervalRef.current = setInterval(() => {
      index += 1;
      if (index >= sequences.length) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
        setPreviewPlaying(false);
        return;
      }
      setSelectedIndex(index);
    }, 1200);
  };

  const previewStyle = useMemo(() => {
    if (!current) return {};
    if (current.backgroundType === 'image' && current.backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,${current.overlayOpacity}), rgba(0,0,0,${current.overlayOpacity})), url(${current.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (current.backgroundType === 'color') {
      return { background: current.backgroundColor || '#111827' };
    }
    return { background: activeTheme.pageBackground };
  }, [current, activeTheme.pageBackground]);

  return (
    <div className="app-shell" style={{ background: activeTheme.pageBackground }}>
      <div className="container">
        <div className="left-column">
          <section className="hero glass">
            <div>
              <div className="badge-row">
                <span className="pill">Clé en main</span>
                <span className="pill">Modifie tout</span>
                <span className="pill">Vidéo TikTok</span>
              </div>
              <h1>Créateur complet de quiz TikTok</h1>
              <p>Tu peux changer chaque séquence une par une, mettre le fond que tu veux, puis générer ta vidéo.</p>
            </div>
            <div className="hero-actions">
              <SmallButton onClick={copyScript}><Copy size={16} /> {copied ? 'Copié' : 'Copier le script'}</SmallButton>
              <SmallButton onClick={exportJson} secondary><Download size={16} /> Export JSON</SmallButton>
              <label className="btn btn-secondary file-label">
                <Download size={16} /> Import JSON
                <input type="file" accept="application/json" hidden onChange={importJson} />
              </label>
            </div>
          </section>

          <section className="tabs glass">
            <div className="tab-row">
              {[
                ['project', 'Projet'],
                ['sequences', 'Séquences'],
                ['edit', 'Modifier'],
                ['background', 'Background'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'project' && (
              <div className="panel-grid two">
                <div className="field wide">
                  <label>Nom du projet</label>
                  <input value={project.title} onChange={(e) => updateProject('title', e.target.value)} />
                </div>
                <div className="field">
                  <label>Thème</label>
                  <select value={project.theme} onChange={(e) => updateProject('theme', e.target.value)}>
                    <option value="neon">Néon</option>
                    <option value="dark">Dark Pro</option>
                    <option value="candy">Candy</option>
                  </select>
                </div>
                <div className="field">
                  <label>Watermark</label>
                  <input value={project.watermark} onChange={(e) => updateProject('watermark', e.target.value)} />
                </div>
                <div className="field">
                  <label>Style de voix</label>
                  <input value={project.voiceStyle} onChange={(e) => updateProject('voiceStyle', e.target.value)} />
                </div>
                <div className="field">
                  <label>Style de musique</label>
                  <input value={project.musicStyle} onChange={(e) => updateProject('musicStyle', e.target.value)} />
                </div>
                <div className="inline-actions wide">
                  <SmallButton onClick={resetAll} danger><RotateCcw size={16} /> Remettre à zéro</SmallButton>
                  <span className="helper"><Save size={14} /> Sauvegarde auto dans le navigateur</span>
                </div>
              </div>
            )}

            {activeTab === 'sequences' && (
              <div className="split-panel">
                <div className="sequence-list">
                  <h3><Layers3 size={18} /> Liste des séquences</h3>
                  {sequences.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`sequence-item ${selectedIndex === index ? 'selected' : ''}`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <span>{item.type}</span>
                      <strong>{item.title}</strong>
                    </button>
                  ))}
                </div>
                <div className="quick-actions">
                  <h3>Ajouter vite</h3>
                  <div className="quick-grid">
                    <SmallButton onClick={addIntro}><Plus size={16} /> Ajouter intro</SmallButton>
                    <SmallButton onClick={addQuestion}><Plus size={16} /> Ajouter question</SmallButton>
                    <SmallButton onClick={addOutro}><Plus size={16} /> Ajouter fin</SmallButton>
                    <SmallButton onClick={duplicateSequence} secondary><Copy size={16} /> Dupliquer</SmallButton>
                    <SmallButton onClick={() => moveSequence('up')} secondary><MoveUp size={16} /> Monter</SmallButton>
                    <SmallButton onClick={() => moveSequence('down')} secondary><MoveDown size={16} /> Descendre</SmallButton>
                    <SmallButton onClick={() => removeSequence(selectedIndex)} danger><Trash2 size={16} /> Supprimer</SmallButton>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'edit' && current && (
              <div className="panel-grid two">
                <div className="field">
                  <label>Nom de la séquence</label>
                  <input value={current.title || ''} onChange={(e) => updateSequence(selectedIndex, 'title', e.target.value)} />
                </div>
                <div className="field">
                  <label>Durée</label>
                  <input type="number" min="1" max="20" value={current.duration || 2} onChange={(e) => updateSequence(selectedIndex, 'duration', Number(e.target.value))} />
                </div>

                {current.type === 'question' ? (
                  <>
                    <div className="field wide">
                      <label>Accroche</label>
                      <input value={current.hook || ''} onChange={(e) => updateSequence(selectedIndex, 'hook', e.target.value)} />
                    </div>
                    <div className="field wide">
                      <label>Question</label>
                      <textarea value={current.question || ''} onChange={(e) => updateSequence(selectedIndex, 'question', e.target.value)} />
                    </div>
                    {(current.options || []).map((opt, i) => (
                      <div className="field" key={i}>
                        <label>Choix {i + 1}</label>
                        <input value={opt} onChange={(e) => updateOption(selectedIndex, i, e.target.value)} />
                      </div>
                    ))}
                    <div className="field">
                      <label>Bonne réponse</label>
                      <input value={current.answer || ''} onChange={(e) => updateSequence(selectedIndex, 'answer', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Durée de la réponse</label>
                      <input type="number" min="0.5" step="0.1" max="10" value={current.answerDuration || 1.2} onChange={(e) => updateSequence(selectedIndex, 'answerDuration', Number(e.target.value))} />
                    </div>
                    <div className="switch-card">
                      <div>
                        <strong>Afficher les choix</strong>
                        <span>Oui ou non</span>
                      </div>
                      <input type="checkbox" checked={!!current.showChoices} onChange={(e) => updateSequence(selectedIndex, 'showChoices', e.target.checked)} />
                    </div>
                    <div className="switch-card">
                      <div>
                        <strong>Barre de progression</strong>
                        <span>Oui ou non</span>
                      </div>
                      <input type="checkbox" checked={!!current.showProgressBar} onChange={(e) => updateSequence(selectedIndex, 'showProgressBar', e.target.checked)} />
                    </div>
                    <div className="switch-card wide">
                      <div>
                        <strong>Révélation auto</strong>
                        <span>Montre la réponse à la fin</span>
                      </div>
                      <input type="checkbox" checked={!!current.autoReveal} onChange={(e) => updateSequence(selectedIndex, 'autoReveal', e.target.checked)} />
                    </div>
                  </>
                ) : (
                  <div className="field wide">
                    <label>Texte affiché</label>
                    <textarea value={current.text || ''} onChange={(e) => updateSequence(selectedIndex, 'text', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'background' && current && (
              <div className="panel-grid two">
                <div className="wide inline-actions">
                  <SmallButton onClick={() => updateSequence(selectedIndex, 'backgroundType', 'theme')} secondary={current.backgroundType !== 'theme'}>
                    <ImageIcon size={16} /> Fond thème
                  </SmallButton>
                  <SmallButton onClick={() => updateSequence(selectedIndex, 'backgroundType', 'color')} secondary={current.backgroundType !== 'color'}>
                    <ImageIcon size={16} /> Couleur unie
                  </SmallButton>
                  <label className="btn btn-secondary file-label">
                    <ImageIcon size={16} /> Image perso
                    <input type="file" accept="image/*" hidden onChange={handleBackgroundUpload} />
                  </label>
                </div>

                <div className="field">
                  <label>Couleur du fond</label>
                  <div className="color-row">
                    <input type="color" value={current.backgroundColor || '#111827'} onChange={(e) => updateSequence(selectedIndex, 'backgroundColor', e.target.value)} />
                    <input value={current.backgroundColor || '#111827'} onChange={(e) => updateSequence(selectedIndex, 'backgroundColor', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Opacité du voile noir</label>
                  <input type="range" min="0" max="0.8" step="0.05" value={Number(current.overlayOpacity ?? 0.2)} onChange={(e) => updateSequence(selectedIndex, 'overlayOpacity', Number(e.target.value))} />
                  <div className="helper-text">{Math.round(Number(current.overlayOpacity ?? 0.2) * 100)}%</div>
                </div>
                <div className="field">
                  <label>Couleur du texte</label>
                  <input type="color" value={current.textColor || '#ffffff'} onChange={(e) => updateSequence(selectedIndex, 'textColor', e.target.value)} />
                </div>
                {current.type === 'question' && (
                  <>
                    <div className="field">
                      <label>Fond réponse</label>
                      <input type="color" value={current.answerBg || '#fde047'} onChange={(e) => updateSequence(selectedIndex, 'answerBg', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Texte réponse</label>
                      <input type="color" value={current.answerText || '#111111'} onChange={(e) => updateSequence(selectedIndex, 'answerText', e.target.value)} />
                    </div>
                  </>
                )}

                {current.backgroundImage && (
                  <div className="field wide">
                    <label>Image actuelle</label>
                    <img src={current.backgroundImage} alt="background" className="thumb" />
                  </div>
                )}

                <div className="wide inline-actions">
                  <SmallButton onClick={resetBackground} secondary><RotateCcw size={16} /> Remettre le fond par défaut</SmallButton>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="right-column">
          <section className="phone-card" style={previewStyle}>
            <div className="phone-overlay" style={{ background: `rgba(0,0,0,${current?.overlayOpacity || 0.2})` }} />
            <div className="phone-content">
              <div className="phone-top">
                <span>{project.watermark}</span>
                <span>{current?.type?.toUpperCase()}</span>
              </div>

              <div className="phone-middle" style={{ color: current?.textColor || '#ffffff' }}>
                <div className="mini-title">{current?.title}</div>
                {current?.type === 'question' ? (
                  <>
                    <div className="hook-pill">{current?.hook}</div>
                    <h2>{current?.question}</h2>
                    {current?.showChoices && (
                      <div className="choice-list">
                        {(current?.options || []).map((opt, i) => (
                          <div key={i} className="choice-item">{opt}</div>
                        ))}
                      </div>
                    )}
                    <div className="timer-circle">{current?.duration}</div>
                    {current?.showProgressBar && <div className="fake-progress"><span /></div>}
                    {current?.autoReveal && (
                      <div className="answer-box" style={{ background: current?.answerBg || activeTheme.answerBg, color: current?.answerText || activeTheme.answerText }}>
                        Réponse : {current?.answer}
                      </div>
                    )}
                  </>
                ) : (
                  <h2>{current?.text}</h2>
                )}
              </div>

              <div className="phone-actions">
                <SmallButton onClick={playSimplePreview}><Play size={16} /> {previewPlaying ? 'Lecture...' : 'Aperçu simple'}</SmallButton>
                <SmallButton onClick={generateVideo} disabled={isGenerating} secondary>
                  {isGenerating ? <Loader2 size={16} className="spin" /> : <Video size={16} />}
                  {isGenerating ? 'Création...' : 'Créer la vidéo'}
                </SmallButton>
              </div>
            </div>
          </section>

          <section className="glass info-card">
            <h3>Vidéo exportable</h3>
            <div className="status-box">{generationText || "Appuie sur 'Créer la vidéo'."}</div>
            {downloadUrl && (
              <>
                <video src={downloadUrl} controls className="video-preview" />
                <a className="download-link" href={downloadUrl} download={`${(project.title || 'quiz').replace(/\s+/g, '-').toLowerCase()}.webm`}>
                  <Download size={16} /> Télécharger la vidéo
                </a>
              </>
            )}
          </section>

          <section className="glass info-card">
            <h3>Script prêt à copier</h3>
            <textarea className="script-box" readOnly value={script} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
