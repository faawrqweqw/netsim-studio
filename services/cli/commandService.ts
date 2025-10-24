import { Vendor } from '../../types';
import ciscoRules from '../../rules/cisco';
import huaweiRules from '../../rules/huawei';
import h3cRules from '../../rules/h3c';

type CommandRule = {
    pattern: string;
    explanation: string;
    conversions: Partial<Record<Vendor, string | ((params: string[]) => string)>>;
};

type RuleSet = {
    commands: CommandRule[];
};

const ruleSets: Record<Vendor, RuleSet> = {
    [Vendor.Cisco]: ciscoRules,
    [Vendor.Huawei]: huaweiRules,
    [Vendor.H3C]: h3cRules,
    [Vendor.Generic]: { commands: [] }
};

const findBestMatch = (rules: CommandRule[], command: string): { rule: CommandRule, params: string[] } | null => {
    let bestMatch: { rule: CommandRule, params: string[] } | null = null;
    let longestPattern = -1;

    for (const rule of rules) {
        const patternParts = rule.pattern.split(' ');
        const commandParts = command.split(' ').filter(p => p);
        
        if (commandParts.length < patternParts.length) {
            continue;
        }

        let isMatch = true;
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i] !== commandParts[i]) {
                isMatch = false;
                break;
            }
        }

        if (isMatch && rule.pattern.length > longestPattern) {
            longestPattern = rule.pattern.length;
            const params = commandParts.slice(patternParts.length);
            bestMatch = { rule, params };
        }
    }
    return bestMatch;
};

const substituteParams = (template: string, params: string[]): string => {
    let result = template;
    // IMPORTANT: Replace $* first, as it's more general and captures all parameters.
    if (result.includes('$*')) {
        result = result.replace(/\$\*/g, params.join(' '));
    }
    params.forEach((param, index) => {
        const placeholder = new RegExp(`\\$${index + 1}`, 'g');
        result = result.replace(placeholder, param);
    });
    return result;
};


export const findCommand = (sourceVendor: Vendor, targetVendor: Vendor, commandInput: string): { explanation: string; convertedCommand: string } => {
    const sourceRules = ruleSets[sourceVendor].commands;
    const commandLines = commandInput.split('\n').filter(line => line.trim() !== '');
    
    const explanations: string[] = [];
    const convertedCommands: string[] = [];

    commandLines.forEach(line => {
        const trimmedLine = line.trim();
        const match = findBestMatch(sourceRules, trimmedLine);

        if (match) {
            const { rule, params } = match;
            explanations.push(substituteParams(rule.explanation, params));
            
            const conversionTemplate = rule.conversions[targetVendor];
            if (conversionTemplate) {
                if (typeof conversionTemplate === 'function') {
                    convertedCommands.push(conversionTemplate(params));
                } else {
                    convertedCommands.push(substituteParams(conversionTemplate, params));
                }
            } else {
                convertedCommands.push(`# No direct conversion for "${trimmedLine}" to ${targetVendor}`);
            }
        } else {
            explanations.push(`- No explanation found for "${trimmedLine}"`);
            convertedCommands.push(`# No conversion found for "${trimmedLine}"`);
        }
    });

    return {
        explanation: explanations.join('\n'),
        convertedCommand: convertedCommands.join('\n')
    };
};