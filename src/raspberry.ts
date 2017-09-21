import { Client, ClientOptions, Message, version as discordVersion } from 'discord.js';
import { inspect, promisify } from 'util';
import { exec } from 'child_process';
const execAsync = promisify(exec);
const config: RaspberryConfig = require('../config.json');

class Raspberry extends Client {

    public constructor(options?: ClientOptions) {
        super(options);

        this.on('ready', () => console.log(`${this.user.tag} ready to rock!`));
        this.on('message', this.message.bind(this));
        this.on('warn', console.error);
        this.on('error', console.error);
    }

    public message(msg: Message) {
        if (msg.author.id !== config.owner) return;
        if (this.prefixCheck(msg.content) === false) return;

        const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        if (command === 'eval') return this.eval(msg, args.join(' '));
        if (command === 'wol') return this.wol(msg);
        if (command === 'exec') return this.exec(msg, args.join(' '));
        if (command === 'stats') return this.stats(msg);
    }

    private async eval(msg: Message, content: string, code: string = 'js') {
        try {
            const result = await eval(content);
            const cleaned = this.clean(result);
            return msg.channel.send(cleaned, { code });
        } catch (error) {
            return msg.channel.send(error.message || error, { code });
        }
    }

    private async wol(msg: Message) {
        const result = execAsync(`wakeonlan ${config.MAC_ADDRESS}`)
            .catch(error => { msg.channel.send(this.clean(error)); });

        if (!result) return;
        return msg.channel.send('Your PC has successfully waked up.');
    }

    private async exec(msg: Message, content: string) {
        return this.eval(msg, `execAsync(${content})`, 'sh');
    }

    private stats(msg: Message) {
        const days = Math.floor(this.uptime / (24 * 60 * 60 * 1000));
        const hours = Math.floor(this.uptime / (60 * 60 * 1000)) % 24;
        const minutes = Math.floor(this.uptime / (60 * 1000)) % 60;
        const seconds = Math.floor(this.uptime / 1000) % 60;
        const duration = [
            days === 0 ? '' : `${days} day${days === 1 ? '' : 's'} `,
            hours === 0 ? '' : `${hours} hour${hours === 1 ? '' : 's'} `,
            minutes === 0 ? '' : `${minutes} minute${minutes === 1 ? '' : 's'} `,
            seconds === 0 ? '' : `${seconds} second${seconds === 1 ? '' : 's'}`
        ].join('');
        return msg.channel.send([
            '= STATISTICS =',
            '',
            `• Mem Usage  :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            `• Uptime     :: ${duration}`,
            `• Users      :: ${this.users.size.toLocaleString()}`,
            `• Servers    :: ${this.guilds.size.toLocaleString()}`,
            `• Channels   :: ${this.channels.size.toLocaleString()}`,
            `• Discord.js :: v${discordVersion}`
        ].join('\n'), { code: 'asciidoc' });
    }

    private clean(text: string): string {
        if (typeof text === 'object' && typeof text !== 'string')
            return inspect(text, { depth: 0, showHidden: true }).replace(this.token, 'REDACTED');

        return String(text).replace(this.token, 'REDACTED');
    }

    private prefixCheck(content: string): boolean {
        for (let i = config.prefix.length - 1; i >= 0; i--)
            if (content[i] !== config.prefix[i])
                return false;

        return true;
    }

}

new Raspberry().login(config.token);

type RaspberryConfig = {
    token: string;
    owner: string;
    prefix: string;
    MAC_ADDRESS: string;
};
