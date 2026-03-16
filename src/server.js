import { createServer } from "node:http";
import { once } from "node:events";

async function handler(request, response) {
	try {
		const chunks = [];
		for await (const chunk of request) {
			chunks.push(chunk);
		}
		const body = Buffer.concat(chunks).toString();
		const data = JSON.parse(body || "{}");

		console.log(`Received: ${JSON.stringify(data)}\n`);

		setTimeout(() => {
			throw new Error("Will be handled on uncaughtException");
		}, 1000);

		Promise.reject("Will be handled on unhandledRejection");
		// await Promise.reject("Will be handled on try/catch");

		response.writeHead(200, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ status: "ok", received: data }));
	} catch (error) {
		console.log(error);
		response.writeHead(500, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ status: "error" }));
	}
}

const server = createServer(handler)
	.listen(3000)
	.on("listening", () => console.log("Server running on port 3000"));

process.on("uncaughtException", (error, origin) => {
	console.log(`${origin} error received: \n ${error}`);
});

process.on("unhandledRejection", async (error) => {
	console.log(`unhandledRejection error received: \n ${error}`);
});

// graceful shutdown
const signals = ["SIGINT", "SIGTERM"];
const ExitStatus = {
	ERROR: 1,
	SUCCESS: 0,
};

async function handleShutdown(signal) {
	console.log(
		`\n[${new Date().toISOString()}] ${signal} received. Starting cleanup...`,
	);

	try {
		server.close(() => {
			console.log("http server closed");
		});
		// db.close()
		// workers.close()

		console.log("Cleanup finished. System exiting.");
		process.exit(ExitStatus.SUCCESS);
	} catch (error) {
		console.error("Error during cleanup:", error);
		process.exit(ExitStatus.ERROR);
	}
}

for (const sig of signals) {
	process.on(sig, () => handleShutdown(sig));
}
