const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "tmp");

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const executeCode = async (language, code, input) => {
    const jobId = `job-${Date.now()}`;
    const jobDir = path.join(OUTPUT_DIR, jobId);

    try {
        await fs.promises.mkdir(jobDir, { recursive: true });

        const inputFilePath = path.join(jobDir, "input.txt");
        await fs.promises.writeFile(inputFilePath, input || "", "utf8");

        let codeFilePath;
        let dockerCommand;
        
        const volumePath = jobDir.replace(/\\/g, "/"); 

        switch (language) {
            case "javascript":
                codeFilePath = path.join(jobDir, "userCode.js");
                await fs.promises.writeFile(codeFilePath, code);
                dockerCommand = `docker run --rm --memory="256m" --cpus="1.0" -v "${volumePath}:/usr/src/app" node:18 sh -c "node /usr/src/app/userCode.js < /usr/src/app/input.txt"`;
                break;

            case "python":
                codeFilePath = path.join(jobDir, "userCode.py");
                await fs.promises.writeFile(codeFilePath, code);
                dockerCommand = `docker run --rm --memory="256m" --cpus="1.0" -v "${volumePath}:/usr/src/app" python:3.9 sh -c "python /usr/src/app/userCode.py < /usr/src/app/input.txt"`;
                break;

            case "cpp":
                codeFilePath = path.join(jobDir, "userCode.cpp");
                await fs.promises.writeFile(codeFilePath, code);
                dockerCommand = `docker run --rm --memory="256m" --cpus="1.0" -v "${volumePath}:/usr/src/app" gcc:11 sh -c "g++ /usr/src/app/userCode.cpp -o /usr/src/app/a.out && /usr/src/app/a.out < /usr/src/app/input.txt"`;
                break;

            case "java":
                const match = code.match(/public\s+class\s+(\w+)/);
                const className = match ? match[1] : "Main";
                codeFilePath = path.join(jobDir, `${className}.java`);
                await fs.promises.writeFile(codeFilePath, code);
                dockerCommand = `docker run --rm --memory="256m" --cpus="1.0" -v "${volumePath}:/usr/src/app" eclipse-temurin:17 sh -c "javac /usr/src/app/${className}.java && java -cp /usr/src/app ${className} < /usr/src/app/input.txt"`;
                break;

            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        return new Promise((resolve, reject) => {
            console.log(`Running job: ${jobId} (${language})`);
            
            exec(dockerCommand, async (error, stdout, stderr) => {
                try {
                    await fs.promises.rm(jobDir, { recursive: true, force: true });
                } catch (cleanupErr) {
                    console.error("Cleanup failed:", cleanupErr);
                }

                if (error) {
                    return resolve({ error: true, output: stderr || error.message });
                }
                resolve({ error: false, output: stdout });
            });
        });

    } catch (err) {
        try {
             await fs.promises.rm(jobDir, { recursive: true, force: true });
        } catch (e) {}
        
        return { error: true, output: err.message };
    }
};

module.exports = { executeCode };