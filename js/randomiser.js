document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('randomiser-file');
    const startButton = document.getElementById('randomiser-start');

    if (!fileInput || !startButton) {
        console.error("Missing required HTML elements: 'randomiser-file' or 'randomiser-start'");
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
                    console.log("Parsed CSV data", data);

                    // Shuffle data with Fisher-Yates algorithm
                    for (let i = data.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [data[i], data[j]] = [data[j], data[i]];
                    }
                    
                    // Split data into 6 approximately equal groups
                    const groups = [];
                    const groupSize = Math.ceil(data.length / 6);
                    for (let i = 0; i < 6; i++) {
                        groups.push(data.slice(i * groupSize, (i + 1) * groupSize));
                    }
                    
                    // Create CSV outputs for each group
                    const groupCSVs = groups.map((group, index) => {
                        return {
                            fileName: `group_${index + 1}.csv`,
                            content: Papa.unparse(group)
                        };
                    });
                    
                    // Create a zip file containing all CSV group files using JSZip
                    const zip = new JSZip();
                    groupCSVs.forEach(group => {
                        zip.file(group.fileName, group.content);
                    });
                    
                    try {
                        const zipBlob = await zip.generateAsync({ type: "blob" });

                        // Function to reset file input and hide start button after save
                        const resetInput = () => {
                            fileInput.value = "";
                            startButton.style.display = 'none';
                        };

                        // If File System Access API is available, let the user choose location and name
                        if (window.showSaveFilePicker) {
                            const options = {
                                suggestedName: 'grouped_csvs.zip',
                                types: [
                                    {
                                        description: 'ZIP Files',
                                        accept: { 'application/zip': ['.zip'] }
                                    }
                                ]
                            };
                            const fileHandle = await window.showSaveFilePicker(options);
                            const writable = await fileHandle.createWritable();
                            await writable.write(zipBlob);
                            await writable.close();
                            console.log("CSV randomisation complete. Zip file saved to user selected location.");
                            resetInput();
                        } else {
                            // Fallback: automatic download with FileSaver.js
                            saveAs(zipBlob, "grouped_csvs.zip");
                            console.log("CSV randomisation complete. Zip file downloaded as 'grouped_csvs.zip'.");
                            resetInput();
                        }
                    } catch (err) {
                        console.error("Error creating or saving zip file:", err);
                    }
                    
                },
                error: function(err) {
                    console.error("Error parsing CSV:", err);
                }
            });
        };
        reader.readAsText(file);
    });
});