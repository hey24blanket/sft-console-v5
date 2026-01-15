const simpleGit = require('simple-git');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class GitService {
    static async syncRepository(data) {
        const { github_config } = data;

        // 1. 설정값 우선순위
        const token = github_config.token || process.env.GITHUB_TOKEN;
        const username = github_config.repo_owner || process.env.GITHUB_USERNAME;
        const repoName = github_config.repo_name;
        const branch = github_config.branch || 'main';
        const localPath = github_config.local_path;

        if (!localPath) throw new Error("로컬 프로젝트 경로(Local Path)가 설정되지 않았습니다.");
        if (!token) throw new Error("GitHub Token이 없습니다.");
        if (!username || !repoName) throw new Error("Repository 정보가 부족합니다.");

        console.log(`🐙 Git Sync Start: ${localPath} -> ${username}/${repoName} (${branch})`);

        const git = simpleGit(localPath);

        // 2. Git 초기화
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            await git.init();
            console.log("Initialized new Git repository.");
        }

        // ★ [추가] 커밋을 위한 사용자 정보 자동 설정 (에러 해결 핵심)
        // 로컬 설정(local config)에만 적용되므로 다른 프로젝트에 영향 없음
        await git.addConfig('user.name', username);
        await git.addConfig('user.email', `${username}@sft-console.local`);

        // 3. Remote URL 구성 (Token 인증)
        const remoteUrl = `https://${username}:${token}@github.com/${username}/${repoName}.git`;

        const remotes = await git.getRemotes(true);
        if (remotes.find(r => r.name === 'origin')) {
            await git.remote(['set-url', 'origin', remoteUrl]);
        } else {
            await git.addRemote('origin', remoteUrl);
        }

        // 4. 스테이징 & 커밋
        await git.add('.');

        const status = await git.status();
        if (status.files.length > 0) {
            const commitMsg = `Update from SFT Console: ${new Date().toLocaleString()}`;
            await git.commit(commitMsg);
            console.log(`Commit created: ${commitMsg}`);
        } else {
            console.log("No changes to commit.");
        }

        // 5. 푸시
        await git.push('origin', branch, { '--set-upstream': null }).catch(async (err) => {
            console.log("Push failed, trying to switch branch...");
            // 브랜치가 안 맞을 경우 대비
            try {
                await git.checkoutLocalBranch(branch);
            } catch (e) { /* 이미 있으면 무시 */ }

            await git.push('origin', branch, { '--set-upstream': null });
        });

        return { success: true, message: `Pushed to ${branch} successfully!` };
    }
}

module.exports = GitService;