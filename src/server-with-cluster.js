import cluster from "node:cluster";
import http from "node:http";
import os from "node:os";
import process from "node:process";

const PORT = 3000;

const { log: logger } = console;

const handleRequest = (request, response) => {
	if (request.url === "/api/status" && request.method === "GET") {
		response.writeHead(200, { "Content-Type": "application/json" });
		response.end(
			JSON.stringify({
				status: "online",
				message: "API respondendo com sucesso!",
				workerId: process.pid,
			}),
		);
	}

	response.writeHead(404, { "Content-Type": "application/json" });
	response.end(JSON.stringify({ erro: "Rota não encontrada!" }));
};

const setupGracefulShutdown = (server) => {
	const shutdown = (signal) => {
		logger(
			`\n[Worker ${process.pid}] Sinal ${signal} recebido. Iniciando graceful shutdown...`,
		);

		server.close(() => {
			logger(
				`[Worker ${process.pid}] Todas as conexões foram finalizadas. Encerrando o processo.`,
			);
			process.exit(0);
		});

		setTimeout(() => {
			logger(
				`[Worker ${process.pid}] Timeout de encerramento atingido. Forçando saída.`,
			);
			process.exit(1);
		}, 10000).unref();
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("uncaughtException", (error, origin) => {
		logger(`${origin} error received: \n ${error}`);
	});
	process.on("unhandledRejection", async (error) => {
		logger(`unhandledRejection error received: \n ${error}`);
	});
};

const startWorker = () => {
	const server = http.createServer(handleRequest);
	server.listen(PORT, () => {
		logger(`[Worker ${process.pid}] Pronto e escutando na porta ${PORT}.`);
	});
	setupGracefulShutdown(server);
};

const startPrimary = () => {
	const numCpus = os.cpus().length * 2;
	logger(`[Worker ${process.pid}] Iniciando cluster com ${numCpus} workers...`);

	for (let i = 0; i < numCpus; i++) cluster.fork();

	cluster.on("exit", (worker, code, signal) => {
		if (
			signal !== "SIGINT" &&
			signal !== "SIGTERM" &&
			!worker.exitedAfterDisconnect
		) {
			logger(
				`[Primário] Worker ${worker.process.pid} morreu inesperadamente. Levantando um substituto...`,
			);
			cluster.fork();
		}
	});
};

const bootstrap = () => (cluster.isPrimary ? startPrimary() : startWorker());

bootstrap();
