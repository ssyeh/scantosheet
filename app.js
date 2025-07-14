document.addEventListener('DOMContentLoaded', () => {
    // !!! =============================================================== !!!
    // !!! ==> 請將此處的網址替換成你從 Google Apps Script 取得的部署網址 <== !!!
    // !!! =============================================================== !!!
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPZAVrJoMhyDjlDQ_wrph5sfgA5d--KKu5Nlv36EkocF2i4lmXSvqsud4Tve5lqLM/exec';

    const resultElement = document.getElementById('result');
    const activityTypeElement = document.getElementById('activityType');
    const scoreElement = document.getElementById('score');

    /**
     * Displays a message in the result element for a few seconds.
     * @param {string} message The message to display.
     * @param {boolean} isSuccess Whether the message indicates success or error.
     */
    function showMessage(message, isSuccess) {
        resultElement.textContent = message;
        resultElement.className = isSuccess ? 'success' : 'error';
        resultElement.style.display = 'block';

        // Hide the message after 5 seconds
        setTimeout(() => {
            resultElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Sends the scanned data to the Google Apps Script backend.
     * @param {string} studentID The decoded student ID from the barcode.
     */
    async function sendDataToSheet(studentID) {
        const activityType = activityTypeElement.value.trim();
        const score = scoreElement.value;

        if (!activityType || !score) {
            showMessage('活動類別和分數不能為空！', false);
            return;
        }

        // Show immediate feedback
        showMessage(`掃描到學號: ${studentID}，正在傳送...`, true);

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for cross-origin requests to Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentID: studentID,
                    activityType: activityType,
                    score: score
                }),
            });
            
            // Note: With 'no-cors', we cannot read the response body from Apps Script.
            // We assume success if the request itself doesn't throw an error.
            // The actual success/error handling is optimistic.
            showMessage(`學號 ${studentID} 已成功傳送！`, true);

        } catch (error) {
            console.error('Error sending data:', error);
            showMessage(`傳送失敗: ${error.message}`, false);
        }
    }

    /**
     * The callback function that gets executed when a barcode is successfully scanned.
     * @param {string} decodedText The decoded text from the barcode.
     * @param {object} decodedResult The full result object from the scanner.
     */
    function onScanSuccess(decodedText, decodedResult) {
        // The library might call this multiple times per scan, so we can add a small debounce
        // or simply handle it. For now, we'll process every successful scan.
        console.log(`Code matched = ${decodedText}`, decodedResult);
        sendDataToSheet(decodedText);
    }

    /**
     * The callback function for handling scan errors.
     * @param {string} errorMessage The error message.
     */
    function onScanFailure(errorMessage) {
        // We can ignore common errors like "No QR code found."
        // console.warn(`Code scan error = ${errorMessage}`);
    }

    // --- Main Execution ---
    // Create a new scanner instance
    const html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", // The ID of the element to render the scanner in
        {
            fps: 10, // Frames per second to scan
            qrbox: { width: 250, height: 250 } // Size of the scanning box
        },
        /* verbose= */ false // Set to true for detailed logs
    );

    // Start the scanner
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});
