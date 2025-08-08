function initCleaner() {
    const fileInput = document.getElementById('cleaner-file');
    const startButton = document.getElementById('cleaner-start');

    if (!fileInput || !startButton) {
        console.error("Missing required HTML elements: 'cleaner-file' or 'cleaner-start'");
        return;
    }

    // Presents start button when a file is selected
    fileInput.addEventListener('change', function() {
        console.log("File selected:", this.files[0]);
        if (this.files && this.files[0]) {
            startButton.style.display = 'inline-block';
        }
    });

    startButton.addEventListener('click', function() {
        console.log("Cleaning clicked");
        const file = fileInput.files[0];
        if (!file) {
            console.error("No file selected");
            return;
        }
        
        const reader = new FileReader();
        reader.onerror = function(error) {
            console.error("Error reading file:", error);
        };
        reader.onload = function(e) {
            const csvData = e.target.result;
            Papa.parse(csvData, {
                header: true,
                dynamicTyping: true,
                complete: async function(results) {
                    let data = results.data;
                    // Removes rows where "Licenses" column contains "Unlicensed"
                    data = data.filter(row => {
                        const licenses = String(row['Licenses'] || '');
                        return !licenses.includes('Unlicensed');
                    });

                    // Removes rows with missing or blank values in key columns, including new fields
                    const requiredFields = [
                        'Department', 'Office', 'First name', 'Last name', 'Usage location',
                        'Title', 'Street address', 'Fax'
                    ];
                    data = data.filter(row => {
                        return requiredFields.every(field => {
                            return row[field] !== undefined && String(row[field]).trim() !== '';
                        });
                    });

                    // Removes rows where "First name" or "Last name" contains any digits
                    data = data.filter(row => {
                        const firstName = String(row['First name'] || '');
                        const lastName = String(row['Last name'] || '');
                        return !(/\d/.test(firstName) || /\d/.test(lastName));
                    });

                    const csvOutput = Papa.unparse(data);

                    // Function to reset file input and hide start button
                    const resetInput = () => {
                        fileInput.value = "";
                        startButton.style.display = 'none';
                    };

                    // If File System Access API is available, allow the user to choose file name and directory
                    if (window.showSaveFilePicker) {
                        try {
                            const options = {
                                suggestedName: 'cleaned.csv',
                                types: [
                                    {
                                        description: 'CSV Files',
                                        accept: { 'text/csv': ['.csv'] }
                                    }
                                ]
                            };
                            const fileHandle = await window.showSaveFilePicker(options);
                            const writable = await fileHandle.createWritable();
                            await writable.write(csvOutput);
                            await writable.close();
                            console.log("CSV cleaning complete. File saved to user selected location.");
                            resetInput();
                        } catch (err) {
                            console.error("Error saving file:", err);
                        }
                    } else {
                        // Fallback: automatic download using FileSaver.js
                        const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
                        saveAs(blob, "cleaned.csv");
                        console.log("CSV cleaning complete. File saved as 'cleaned.csv'.");
                        resetInput();
                    }
                },
                error: function(err) {
                    console.error("Error parsing CSV:", err);
                }
            });
        };
        reader.readAsText(file);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCleaner);
} else {
    initCleaner();
}