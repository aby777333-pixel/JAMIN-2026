import { Image } from 'expo-image';
import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/**
 * Route-aware page backdrop (owner brief: "assign appropriate backgrounds
 * throughout the application" from the supplied bgimages collection).
 *
 * Every scrollable Screen renders this behind its content by default: the
 * section's artwork at very low opacity over the paper background, so cards
 * and text keep full contrast (the readability overlay is simply the paper
 * colour showing through). Purely decorative — pointerEvents "none", no
 * layout impact, and expo-image caches each bundled asset after first use.
 */
const ART = {
  chaiMango: require('../../../assets/images/bg/chai-mango.jpg'),
  paddyRiver: require('../../../assets/images/bg/paddy-river.jpg'),
  wheatTree: require('../../../assets/images/bg/wheat-tree-house.jpg'),
  kitesDusk: require('../../../assets/images/bg/kites-dusk.jpg'),
  haveliBanyan: require('../../../assets/images/bg/haveli-banyan.jpg'),
  autumnMinimal: require('../../../assets/images/bg/autumn-minimal.jpg'),
  pomegranateGate: require('../../../assets/images/bg/pomegranate-gate.jpg'),
  poplarAvenue: require('../../../assets/images/bg/poplar-avenue.jpg'),
  banyanRickshaw: require('../../../assets/images/bg/banyan-rickshaw.jpg'),
  watercolorVillage: require('../../../assets/images/bg/watercolor-village.jpg'),
  mistyLake: require('../../../assets/images/bg/misty-lake.jpg'),
  alpineLake: require('../../../assets/images/bg/alpine-lake.jpg'),
  riversideRoad: require('../../../assets/images/bg/riverside-road.jpg'),
  palmValley: require('../../../assets/images/bg/palm-valley.jpg'),
  autumnLake: require('../../../assets/images/bg/autumn-lake.jpg'),
  keralaHome: require('../../../assets/images/bg/kerala-home.jpg'),
  villageElephant: require('../../../assets/images/bg/village-elephant.jpg'),
  villagePicnic: require('../../../assets/images/bg/village-picnic.jpg'),
  coastalRoad: require('../../../assets/images/bg/coastal-road.jpg'),
} as const;

/**
 * Longest-prefix wins. Paths come from usePathname() (route groups already
 * stripped, e.g. "/(tabs)/properties" → "/properties").
 */
const ROUTE_ART: [prefix: string, art: number][] = [
  // Browse & property
  ['/properties', ART.paddyRiver],
  ['/property', ART.chaiMango],
  ['/projects', ART.alpineLake],
  ['/project', ART.alpineLake],
  ['/nri', ART.coastalRoad],
  // Money
  ['/wallet', ART.wheatTree],
  ['/payments', ART.wheatTree],
  ['/escrow', ART.wheatTree],
  ['/incentives', ART.autumnLake],
  ['/rewards', ART.autumnLake],
  // Activity & comms
  ['/activity', ART.kitesDusk],
  ['/notifications', ART.kitesDusk],
  ['/offers', ART.villagePicnic],
  ['/community', ART.banyanRickshaw],
  ['/support', ART.banyanRickshaw],
  ['/help', ART.banyanRickshaw],
  // Identity
  ['/account', ART.haveliBanyan],
  ['/profile', ART.haveliBanyan],
  ['/settings', ART.haveliBanyan],
  ['/role', ART.haveliBanyan],
  ['/card', ART.villageElephant],
  // Finance tools
  ['/calculators', ART.autumnMinimal],
  ['/loans', ART.autumnMinimal],
  // Seller
  ['/sell', ART.pomegranateGate],
  ['/my-posts', ART.pomegranateGate],
  // Partner / team
  ['/leads', ART.poplarAvenue],
  ['/clients', ART.poplarAvenue],
  ['/network', ART.poplarAvenue],
  ['/recruit', ART.poplarAvenue],
  ['/performance', ART.poplarAvenue],
  ['/promoter-hub', ART.poplarAvenue],
  ['/team', ART.poplarAvenue],
  ['/referrals', ART.poplarAvenue],
  ['/cobroke', ART.poplarAvenue],
  ['/academy', ART.palmValley],
  // Culture
  ['/vastu', ART.watercolorVillage],
  ['/blessing', ART.watercolorVillage],
  ['/griha-pravesh', ART.watercolorVillage],
  // Documents & records
  ['/documents', ART.mistyLake],
  ['/kyc', ART.mistyLake],
  ['/forms', ART.mistyLake],
  ['/submissions', ART.mistyLake],
  // Buyer workspace
  ['/buyer-hub', ART.keralaHome],
  ['/preferences', ART.keralaHome],
  ['/saved-searches', ART.keralaHome],
  ['/compare', ART.keralaHome],
  ['/recent', ART.keralaHome],
  ['/shortlists', ART.keralaHome],
  ['/requirements', ART.keralaHome],
  // Visits & location
  ['/visits', ART.riversideRoad],
  ['/agenda', ART.riversideRoad],
  ['/availability', ART.riversideRoad],
  ['/map', ART.riversideRoad],
];

function artFor(path: string): number {
  let best: number = ART.mistyLake; // serene default for unmapped screens
  let bestLen = 0;
  for (const [prefix, art] of ROUTE_ART) {
    if (path.startsWith(prefix) && prefix.length > bestLen) {
      best = art;
      bestLen = prefix.length;
    }
  }
  return best;
}

export function RouteBackdrop() {
  const path = usePathname();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={artFor(path)}
        style={{ flex: 1, opacity: 0.3 }}
        contentFit="cover"
        transition={200}
      />
    </View>
  );
}
