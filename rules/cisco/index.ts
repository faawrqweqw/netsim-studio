

import { generalRules } from './general';
import { interfaceRules } from './interface';
import { dhcpRules } from './dhcp';
import { vlanRules } from './vlan';
import { linkAggregationRules } from './linkAggregation';
import { routingRules } from './routing';
import { vrrpRules } from './vrrp';
import { objectGroupRules } from './objectGroup';
import { ipsecRules } from './ipsec';
import { ikeRules } from './ike';
import { greRules } from './gre';
import { natRules } from './nat';
import { stackingRules } from './stacking';

const ciscoRules = {
  commands: [
    ...generalRules,
    ...interfaceRules,
    ...dhcpRules,
    ...vlanRules,
    ...linkAggregationRules,
    ...routingRules,
    ...vrrpRules,
    ...objectGroupRules,
    ...ipsecRules,
    ...ikeRules,
    ...greRules,
    ...natRules,
    ...stackingRules,
  ]
};
export default ciscoRules;