const fs = require('fs');
const csv = require('csv-parser');
const prisma = require('../config/db');

const VALID_SECTIONS = ['REASONING', 'VERBAL', 'NUMERICAL', 'CORE'];
const SECTION_MAPPING = {
    'Reasoning': 'REASONING',
    'Verbal Ability': 'VERBAL',
    'Numerical Ability': 'NUMERICAL',
    'Core Questions': 'CORE'
};

const importQuestionsFromCSV = async (examId, filePath) => {
    const results = {
        total: 0,
        success: 0,
        failed: 0,
        errors: []
    };

    const questionsToInsert = [];
    const rows = [];

    return new Promise((resolve, reject) => {
        let separator = ',';
        let content = '';
        
        try {
            const buffer = fs.readFileSync(filePath);
            
            // Handle UTF-16 or UTF-8 with BOM
            if (buffer[0] === 0xFF && buffer[1] === 0xFE) content = buffer.toString('utf16le');
            else if (buffer[0] === 0xFE && buffer[1] === 0xFF) content = buffer.toString('utf16be');
            else content = buffer.toString('utf8');

            // Fallback for UTF-16 without BOM
            if (content.includes('\0')) content = content.replace(/\0/g, '');
        } catch (e) {
            console.error('[CSV Import] Encoding detection failed, defaulting to UTF-8');
            content = fs.readFileSync(filePath, 'utf8');
        }

        // Get first non-empty line for delimiter detection
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return resolve(results);
        }

        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const pipeCount = (firstLine.match(/\|/g) || []).length;
        
        if (semiCount > commaCount && semiCount > tabCount && semiCount > pipeCount) separator = ';';
        else if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) separator = '\t';
        else if (pipeCount > commaCount && pipeCount > semiCount && pipeCount > tabCount) separator = '|';
        
        console.log(`[CSV Import] Detected "${separator}" separator (Counts: ,:${commaCount}, ;:${semiCount}, \\t:${tabCount}, |:${pipeCount})`);

        const { Readable } = require('stream');
        const stream = Readable.from(lines.join('\n'));

        // Check for Excel/ZIP header (PK\x03\x04)
        stream.once('data', (chunk) => {
            if (chunk[0] === 0x50 && chunk[1] === 0x4B) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                reject(new Error('You uploaded an Excel (.xlsx) file. Please "Save As" CSV (Comma delimited) and try again.'));
                stream.destroy();
            }
        });

        stream.pipe(csv({
                separator: separator,
                mapHeaders: ({ header }) => {
                    const cleanHeader = header.replace(/[^\x20-\x7E]/g, '').trim();
                    const h = cleanHeader.toLowerCase();
                    
                    if (h.includes('question')) return 'questionText';
                    if (h.includes('optiona')) return 'optionA';
                    if (h.includes('optionb')) return 'optionB';
                    if (h.includes('optionc')) return 'optionC';
                    if (h.includes('optiond')) return 'optionD';
                    if (h.includes('correct')) return 'correctAnswer';
                    if (h.includes('section')) return 'section';
                    if (h.includes('type')) {
                        if (h.includes('question')) return 'questionType';
                        if (h.includes('graph')) return 'graphType';
                    }
                    if (h.includes('graphdata') || h.includes('graph data')) return 'graphData';
                    if (h.includes('imageurl') || h.includes('image url') || h.includes('image_url')) return 'imageUrl';
                    return cleanHeader;
                }
            }))
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                results.total = rows.length;
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    try {
                        const validated = validateRow(row, i);
                        questionsToInsert.push({
                            examId,
                            questionText: validated.questionText,
                            optionA: validated.optionA,
                            optionB: validated.optionB,
                            optionC: validated.optionC,
                            optionD: validated.optionD,
                            correctAnswer: validated.correctAnswer,
                            section: validated.section,
                            questionType: validated.questionType || 'MCQ',
                            graphData: validated.graphData || null,
                            graphType: validated.graphType || null,
                            imageUrl: validated.imageUrl || null
                        });
                        results.success++;
                    } catch (err) {
                        results.failed++;
                        results.errors.push(`Row ${i + 2}: ${err.message}`);
                    }
                }

                if (questionsToInsert.length > 0) {
                    try {
                        await prisma.question.createMany({ data: questionsToInsert });
                    } catch (err) {
                        results.failed += questionsToInsert.length;
                        results.success -= questionsToInsert.length;
                        results.errors.push(`Database error: ${err.message}`);
                    }
                }

                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                resolve(results);
            })
            .on('error', (err) => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                reject(err);
            });
    });
};

const validateRow = (row, index) => {
    const data = {};
    Object.keys(row).forEach(key => { data[key] = row[key] ? row[key].trim() : ''; });

    const { questionText, optionA, optionB, optionC, optionD, correctAnswer, section, questionType, graphData, graphType, imageUrl } = data;

    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !section) {
        const foundKeys = Object.keys(row);
        if (foundKeys.length === 1 && (row[foundKeys[0]].includes(',') || row[foundKeys[0]].includes(';') || row[foundKeys[0]].includes('\t'))) {
           throw new Error(`Mapping error: Only detected one column "${foundKeys[0]}". Ensure your CSV uses the correct separator.`);
        }
        const missing = [];
        if (!questionText) missing.push('questionText');
        if (!optionA) missing.push('optionA');
        if (!optionB) missing.push('optionB');
        if (!optionC) missing.push('optionC');
        if (!optionD) missing.push('optionD');
        if (!correctAnswer) missing.push('correctAnswer');
        if (!section) missing.push('section');
        throw new Error(`Missing fields: [${missing.join(', ')}].`);
    }

    let mappedSection = null;
    const sUpper = section.toUpperCase();
    if (sUpper.includes('REASONING')) mappedSection = 'REASONING';
    else if (sUpper.includes('VERBAL')) mappedSection = 'VERBAL';
    else if (sUpper.includes('NUMERICAL')) mappedSection = 'NUMERICAL';
    else if (sUpper.includes('CORE')) mappedSection = 'CORE';
    else mappedSection = SECTION_MAPPING[section] || sUpper;

    if (!VALID_SECTIONS.includes(mappedSection)) {
        throw new Error(`Invalid section: "${section}".`);
    }

    const ans = correctAnswer.toUpperCase();
    let actualCorrectContent = '';
    if (ans === 'A') actualCorrectContent = optionA;
    else if (ans === 'B') actualCorrectContent = optionB;
    else if (ans === 'C') actualCorrectContent = optionC;
    else if (ans === 'D') actualCorrectContent = optionD;
    else {
        const lowerAns = correctAnswer.toLowerCase();
        if (lowerAns === optionA.toLowerCase()) actualCorrectContent = optionA;
        else if (lowerAns === optionB.toLowerCase()) actualCorrectContent = optionB;
        else if (lowerAns === optionC.toLowerCase()) actualCorrectContent = optionC;
        else if (lowerAns === optionD.toLowerCase()) actualCorrectContent = optionD;
        else throw new Error(`Invalid correctAnswer: "${correctAnswer}".`);
    }

    let parsedGraphData = null;
    if (questionType === 'GRAPH' && graphData) {
        try { parsedGraphData = JSON.parse(graphData); } catch (e) { throw new Error('Invalid JSON in graphData'); }
    }

    return {
        questionText, optionA, optionB, optionC, optionD,
        correctAnswer: actualCorrectContent,
        section: mappedSection,
        questionType: questionType || 'MCQ',
        graphData: parsedGraphData,
        graphType: graphType || null,
        imageUrl: imageUrl || null
    };
};

module.exports = { importQuestionsFromCSV };
