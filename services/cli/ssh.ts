import { SSHConfig, Vendor } from '../../types';

export const generateSshCli = (vendor: Vendor, deviceType: string, config: SSHConfig): { cli: string; explanation: string } => {
    let cli = '';

    if (!config.enabled) {
        return { cli: '', explanation: '' };
    }

    switch (vendor) {
        case Vendor.H3C:
            //cli += 'public-key local create rsa\n';
            cli += 'ssh server enable\n\n';
            
            config.users.forEach(user => {
                if (!user.username || !user.password || user.passwordError) return;
                cli += `local-user ${user.username} class manage\n`;
                cli += ` password simple ${user.password}\n`;
                cli += ' service-type ssh\n';
                cli += ' authorization-attribute user-role network-admin\n';
                cli += 'quit\n\n';
            });
            
            cli += `line vty ${config.vtyLines}\n`;
            cli += ` authentication-mode ${config.authenticationMode}\n`;
            cli += ` user-role network-admin\n`;
            cli += ` protocol inbound ${config.protocolInbound}\n`;
            cli += 'quit\n';
            break;

        case Vendor.Huawei:
            cli += 'stelnet server enable\n\n';
            
            if (config.sourceInterface) {
                cli += `ssh server-source -i ${config.sourceInterface}\n\n`;
            }
            
            cli += 'aaa\n';
            config.users.forEach(user => {
                if (!user.username || !user.password || user.passwordError) return;
                cli += ` local-user ${user.username} password irreversible-cipher ${user.password}\n`;
                cli += ` local-user ${user.username} service-type ssh\n`;
                cli += ` local-user ${user.username} privilege level 15\n`;
            });
            cli += 'quit\n\n';

            config.users.forEach(user => {
                if(user.username) {
                   cli += `ssh user ${user.username} authentication-type password\n`;
                }
            });
            cli += '\n';

            cli += `user-interface vty ${config.vtyLines}\n`;
            cli += ` authentication-mode aaa\n`;
            cli += ` user privilege level 15\n`;
            cli += ` protocol inbound ${config.protocolInbound}\n`;
            cli += 'quit\n';
            break;
            
        case Vendor.Cisco:
            if(config.domainName) {
                cli += `ip domain-name ${config.domainName}\n`;
            }
            cli += 'crypto key generate rsa modulus 1024\n\n';
            cli += 'ip ssh version 2\n\n';

            config.users.forEach(user => {
                if (!user.username || !user.password || user.passwordError) return;
                cli += `username ${user.username} privilege 15 secret ${user.password}\n`;
            });
            cli += '\n';

            cli += `line vty ${config.vtyLines}\n`;
            cli += ` login local\n`;
            cli += ` transport input ${config.protocolInbound}\n`;
            cli += 'exit\n';
            break;
            
        default:
            cli = `# SSH configuration for ${vendor} is not implemented.`;
    }

    return { cli: cli.trim(), explanation: "SSH server configuration generated." };
};