class CardGenerator {
    constructor() {
        this.cardPatterns = {
            visa: /^4[0-9]{5,}$/,
            mastercard: /^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01])/,
            amex: /^3[47]/,
            discover: /^6(?:011|5)/,
            diners: /^3(?:0[0-5]|[68])/
        };
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.display = 'flex';
        setTimeout(() => toast.style.display = 'none', 3000);
    }

    detectCardType(bin) {
        for (const [type, pattern] of Object.entries(this.cardPatterns)) {
            if (pattern.test(bin)) return type;
        }
        return 'unknown';
    }

    validateBin(bin) {
        const type = this.detectCardType(bin);
        const length = bin.length;
        const rules = {
            visa: length >= 6 && length <= 19,
            mastercard: length === 5,
            amex: length === 6,
            discover: length === 6,
            diners: length === 3
        };
        return rules[type] || length >= 6 && length <= 14;
    }

    generateCard(bin) {
        const isAmex = bin.startsWith('34') || bin.startsWith('37');
        const targetLength = isAmex ? 15 : 16;
        const remainingDigits = targetLength - bin.length - 1;

        if (remainingDigits < 0) {
            this.showToast(`BIN too long (max ${targetLength - 1} digits)`, 'error');
            return { valid: false };
        }

        let cardNumber = bin;
        for (let i = 0; i < remainingDigits; i++) {
            cardNumber += Math.floor(Math.random() * 10);
        }
        cardNumber += this.calculateCheckDigit(cardNumber);

        const expMonth = document.getElementById('expMonth').value || 
            String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        
        let expYear = document.getElementById('expYear').value || 
            String(new Date().getFullYear() % 100 + Math.floor(Math.random() * 5) + 1).padStart(2, '0');
        expYear = expYear.startsWith('20') ? expYear : `20${expYear}`;

        const cvvInput = document.getElementById('cvvInput').value;
        const cvvLength = isAmex ? 4 : 3;
        const cvv = cvvInput === '' 
            ? String(Math.floor(Math.random() * (isAmex ? 9000 : 900)) + (isAmex ? 1000 : 100))
                .padStart(cvvLength, '0')
            : cvvInput.padEnd(cvvLength, '0').slice(0, cvvLength);

        return { 
            valid: true, 
            number: cardNumber, 
            expMonth, 
            expYear, 
            cvv,
            type: this.detectCardType(cardNumber)
        };
    }

    calculateCheckDigit(number) {
        let sum = 0;
        let alternate = true;
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number[i], 10);
            if (alternate) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            alternate = !alternate;
        }
        return (10 - (sum % 10)) % 10;
    }

    formatNumber(number) {
        if (number.length === 15) {
            return `${number.substr(0,4)} ${number.substr(4,6)} ${number.substr(10,5)}`;
        }
        return `${number.substr(0,4)} ${number.substr(4,4)} ${number.substr(8,4)} ${number.substr(12,4)}`;
    }

    convertFormat(cards, format) {
        const lines = cards.split('\n').filter(l => l);
        if (format === 'csv') {
            return 'Card Number,Expiration,CVV,Type\n' + 
                lines.map(l => {
                    const [number, exp, cvv] = l.split(' | ');
                    const type = this.detectCardType(number.replace(/ /g, ''));
                    return `"${number}","${exp}","${cvv}","${type}"`;
                }).join('\n');
        }
        if (format === 'json') {
            return JSON.stringify(lines.map(line => {
                const [number, exp, cvv] = line.split(' | ');
                const type = this.detectCardType(number.replace(/ /g, ''));
                return { number, expiration: exp, cvv, type };
            }), null, 2);
        }
        return cards;
    }
}

const generator = new CardGenerator();

function toggleTheme() {
    const body = document.body;
    const moonIcon = document.querySelector('.theme-icon.moon');
    const sunIcon = document.querySelector('.theme-icon.sun');
    
    if(body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        localStorage.setItem('theme', 'dark');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const moonIcon = document.querySelector('.theme-icon.moon');
    const sunIcon = document.querySelector('.theme-icon.sun');
    
    if(savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.body.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }
}
initTheme();

function validateBin(bin) {
    const errorElement = document.getElementById('binError');
    const isValid = generator.validateBin(bin);
    
    errorElement.textContent = isValid ? 'Valid BIN format' : 'Invalid BIN format';
    errorElement.className = `validation-message ${isValid ? 'valid' : 'invalid'}`;
    errorElement.style.display = 'block';

    updateCardPreview(bin);
}

function updateCardPreview(bin) {
    const type = generator.detectCardType(bin);
    const previewNumber = bin.padEnd(16, 'X').match(/.{1,4}/g).join(' ');
    
    document.getElementById('previewCardType').textContent = type.toUpperCase();
    document.getElementById('previewCardNumber').textContent = previewNumber;
    document.getElementById('previewCardType').className = `card-type ${type}`;
}

function generateCards() {
    const bin = document.getElementById('binInput').value;
    
    if (!bin || !generator.validateBin(bin)) {
        generator.showToast('Please enter a valid BIN number', 'error');
        return;
    }

    setLoading(true);
    
    try {
        const container = document.getElementById('cardList');
        container.innerHTML = '';
        
        const quantity = parseInt(document.getElementById('cardQuantity').value);
        let generatedCards = [];
        
        for(let i = 0; i < quantity; i++) {
            const cardData = generator.generateCard(bin);
            if (!cardData.valid) break;
            
            const cardString = `${generator.formatNumber(cardData.number)} | ${cardData.expMonth}/${cardData.expYear.slice(-2)} | ${cardData.cvv}`;
            generatedCards.push(cardString);

            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-item';
            cardDiv.innerHTML = `
                <span class="card-type ${cardData.type}">${cardData.type}</span>
                <span class="card-number">${cardString}</span>
                <button class="copy-btn" onclick="copySingleCard(this)">COPY</button>
            `;
            container.appendChild(cardDiv);
        }

        if(generatedCards.length > 0) {
            generator.showToast(`Generated ${generatedCards.length} cards successfully`);
        }
    } catch (error) {
        generator.showToast('Card generation failed: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function copySingleCard(button) {
    const cardText = button.previousElementSibling.textContent;
    navigator.clipboard.writeText(cardText)
        .then(() => generator.showToast('Card copied to clipboard'))
        .catch(() => generator.showToast('Copy failed', 'error'));
}

async function copyAllCards() {
    const cards = Array.from(document.querySelectorAll('.card-number'))
        .map(el => el.textContent)
        .join('\n');
        
    if (!cards.trim()) {
        generator.showToast('No cards to copy', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(cards);
        generator.showToast('All cards copied to clipboard');
    } catch {
        generator.showToast('Copy failed', 'error');
    }
}

async function exportCards() {
    const format = document.getElementById('exportFormat').value;
    const cards = Array.from(document.querySelectorAll('.card-number'))
        .map(el => el.textContent)
        .join('\n');
        
    if (!cards.trim()) {
        generator.showToast('No cards to export', 'error');
        return;
    }

    try {
        const converted = generator.convertFormat(cards, format);
        const blob = new Blob([converted], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cards_${new Date().toISOString().slice(0,10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        generator.showToast(`Exported as ${format.toUpperCase()} file`);
    } catch (error) {
        generator.showToast('Export failed', 'error');
    }
}

function setLoading(state) {
    const btn = document.querySelector('button[onclick="generateCards()"]');
    const overlay = document.getElementById('loadingOverlay');
    
    btn.disabled = state;
    overlay.style.display = state ? 'flex' : 'none';
    
    if(state) {
        btn.innerHTML = `<div class="loading-spinner"></div> Generating...`;
    } else {
        btn.innerHTML = `Generate Cards`;
    }
}

document.addEventListener('keydown', (e) => {
    if(e.ctrlKey && e.key === 'Enter') generateCards();
});