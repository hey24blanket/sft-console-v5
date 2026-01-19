const simpleGit = require('simple-git');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class GitService {
    static async syncRepository(data) {
        const { github_config } = data;

        // 1. 설정값 검증
        const token = github_config.token || process.env.GITHUB_TOKEN;
        const username = github_config.repo_owner || process.env.GITHUB_USERNAME;
        const repoName = github_config.repo_name;
        const branch = github_config.branch || 'main';
        const localPath = github_config.local_path;

        if (!localPath) throw new Error("Local Path is missing in Settings.");
        if (!token) throw new Error("GitHub Token is missing.");
        if (!username || !repoName) throw new Error("Repository info is incomplete.");

        console.log(`🐙 Git Sync Start: ${localPath} -> ${username}/${repoName} (${branch})`);

        const git = simpleGit(localPath);

        // 2. Git 초기화 체크
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            await git.init();
            console.log("Initialized new Git repository.");
        }

        // 유저 정보 설정 (로컬)
        await git.addConfig('user.name', username);
        await git.addConfig('user.email', `${username}@sft-console.local`);

        // 3. Remote URL 설정 (토큰 포함)
        const remoteUrl = `https://${username}:${token}@github.com/${username}/${repoName}.git`;
        const remotes = await git.getRemotes(true);

        if (remotes.find(r => r.name === 'origin')) {
            await git.remote(['set-url', 'origin', remoteUrl]);
        } else {
            await git.addRemote('origin', remoteUrl);
        }

        // 4. 상태 확인 및 커밋
        let commitMsg = "No changes";
        try {
            const status = await git.status();

            if (status.files.length > 0) {
                await git.add('.');
                commitMsg = `Update from SFT Console: ${new Date().toLocaleString()}`;
                await git.commit(commitMsg);
                console.log(`✅ Commit created: ${commitMsg}`);
            } else {
                console.log("ℹ️ No changes to commit (Proceeding to push...)");
            }
        } catch (e) {
            console.warn("⚠️ Commit step warning:", e.message);
        }

        // 5. 푸시 (변경사항 없어도 수행 - 이전에 커밋만 되고 푸시 안 된 경우 대비)
        try {
            await git.push('origin', branch);
            console.log("✅ Push Success!");
            return { success: true, message: `Synced successfully! (${commitMsg})` };
        } catch (pushErr) {
            // 브랜치 없으면 upstream 설정 시도
            console.log("Push failed, trying set-upstream...");
            try {
                await git.push('origin', branch, { '--set-upstream': null });
                return { success: true, message: `Synced (Upstream Set)!` };
            } catch (finalErr) {
                console.error("❌ Push Failed:", finalErr.message);
                // "Everything up-to-date"는 에러가 아님
                if (finalErr.message.includes('Everything up-to-date')) {
                    return { success: true, message: "Already up-to-date." };
                }
                throw finalErr;
            }
        }
    }
}

module.exports = GitService;