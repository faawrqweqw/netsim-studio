import { generalRules } from './general';
import { interfaceRules } from './interface';
import { dhcpRules } from './dhcp';
import { vlanRules } from './vlan';
import { portIsolationRules } from './portIsolation';
import { linkAggregationRules } from './linkAggregation';
import { routingRules } from './routing';
import { vrrpRules } from './vrrp';
import { securityRules, natGlobalPolicyRules } from './security';
import { objectGroupRules } from './objectGroup';
import { ipsecRules } from './ipsec';
import { ikeRules } from './ike';
import { haRules } from './ha';
import { greRules } from './gre';
import { stackingRules } from './stacking';

const h3cRules = {
  commands: [
    ...generalRules,
    ...interfaceRules,
    ...dhcpRules,
    ...vlanRules,
    ...portIsolationRules,
    ...linkAggregationRules,
    ...routingRules,
    ...vrrpRules,
    ...securityRules,
    ...objectGroupRules,
    ...ipsecRules,
    ...ikeRules,
    ...haRules,
    ...natGlobalPolicyRules,
    ...greRules,
    ...stackingRules,
  ]
};
export default h3cRules;
