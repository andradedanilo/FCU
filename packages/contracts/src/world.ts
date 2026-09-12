import type {Career,Division} from './index.ts';
import {clubSchema} from './index.ts';
import {clubs} from './identity.ts';
// Editorial fictional identities. Existing approved IDs remain unchanged.
const reserved=[['Barcelona Sporting','BSP','#ad466e'],['Munich Royal','MUR','#d94848'],['Milano International','MIN','#507dcc'],['Milano Rossonero','MRO','#bc4040']];
const top={
 ENG:['Newcastle Riverside','Birmingham Claret','Nottingham Forestside','Brighton Coast FC','Leeds White Rose','Sheffield Steel FC','Sunderland Wearside','Leicester Crown','Southampton Harbour','Wolverhampton Gold','Bournemouth Coast','Bristol Redbridge','Ipswich Heritage','Norwich Amber'],
 ESP:['Sevilla Orange FC','Valencia Mediterranean','Bilbao North Coast','San Sebastian Athletic','Vigo Atlantic','Pamplona Navarra','Villarreal Golden','Getafe Central','Girona River FC','Mallorca Island','Granada Alba','Malaga Coast','Zaragoza Aragon','Valladolid Crown','Oviedo Astur','Santander Bay','Cadiz Harbour'],
 FRA:['Paris Lumiere','Marseille Mediterranean','Lyon Rhone FC','Monaco Riviera','Lille Flanders','Nice Azure','Rennes Brittany','Nantes Loire','Strasbourg Alsace','Lens Miners','Toulouse Violet','Montpellier South','Bordeaux Garonne','Saint-Etienne Loire','Brest Atlantic','Metz Lorraine','Reims Champagne','Le Havre Maritime'],
 ITA:['Torino Piedmont','Roma Capitolina','Napoli Vesuvio','Firenze Viola','Bologna Portico','Bergamo Oro','Genova Maritime','Parma Ducale','Verona Arena','Udine Friuli','Lecce Salento','Cagliari Island','Palermo Rosalia','Sassuolo Verde','Como Lakeside','Venezia Lagoon','Pisa Torre','Monza Brianza'],
 DEU:['Dortmund Westfalen','Leipzig Saxon','Leverkusen Rhineland','Frankfurt Main FC','Stuttgart Neckar','Freiburg Black Forest','Bremen Riverside','Hamburg Harbour','Berlin Capital','Wolfsburg Green','Mainz Rhine FC','Augsburg Swabian','Cologne Cathedral','Hoffenheim Kraichgau','Monchengladbach Rhine','Heidenheim Hills','Nuremberg Franconia']
};
const lower={
 ENG:['York','Exeter','Bath','Chester','Oxford','Cambridge','Lincoln','Worcester','Truro','Durham','Lancaster','Carlisle','Winchester','Salisbury','Hereford','Gloucester'],
 ESP:['Burgos','Leon','Salamanca','Toledo','Segovia','Avila','Cuenca','Huesca','Lleida','Lugo','Ourense','Jaen','Almeria','Cordoba','Merida','Tarragona'],
 FRA:['Amiens','Angers','Annecy','Avignon','Besancon','Caen','Clermont','Dijon','Grenoble','Limoges','Nancy','Nimes','Orleans','Poitiers','Rouen','Tours'],
 ITA:['Arezzo','Ascoli','Cesena','Ferrara','Lucca','Mantova','Modena','Novara','Padova','Perugia','Pescara','Ravenna','Reggio Emilia','Rimini','Siena','Vicenza'],
 DEU:['Aachen','Bamberg','Bayreuth','Bielefeld','Bochum','Chemnitz','Cottbus','Darmstadt','Dresden','Erfurt','Halle','Karlsruhe','Kiel','Lubeck','Osnabruck','Regensburg']
};
const palette=['#c44848','#4678b5','#e0b454','#4b947b','#9a67ad','#d98249'];
const countries=['ENG','ESP','FRA','ITA','DEU'] as const;
const identities=[...clubs,...reserved.map(([name,short,color],i)=>clubSchema.parse({id:`club-${String(i+9).padStart(2,'0')}`,name,short,color}))];
const first:Record<typeof countries[number],string[]>={ENG:clubs.slice(0,6).map(c=>c.id),ESP:[clubs[6]!.id,clubs[7]!.id,'club-09'],FRA:[],ITA:['club-11','club-12'],DEU:['club-10']};
const divisions:Division[]=[];
for(const country of countries){
 const members=[...first[country]];
 for(const name of top[country]){const number=identities.length+1,id=`club-${String(number).padStart(2,'0')}`;identities.push(clubSchema.parse({id,name,short:name.split(' ').map(w=>w[0]).join('').slice(0,4).toUpperCase(),color:palette[number%palette.length]}));members.push(id);}
 divisions.push({id:country+'1',country,tier:1,clubs:members.map(id=>clubSchema.shape.id.parse(id))});
 const seconds=lower[country].map((city,i)=>{const number=identities.length+1,id=`club-${String(number).padStart(2,'0')}`;identities.push(clubSchema.parse({id,name:city+' '+['Athletic','Sporting','United','City FC'][i%4],short:city.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase(),color:palette[number%palette.length]}));return clubSchema.shape.id.parse(id);});
 divisions.push({id:country+'2',country,tier:2,clubs:seconds});
}
export const worldClubs=identities;
export const countryWorld:Career['world']={kind:'countries',divisions};
export const exhibitionWorld:Career['world']={kind:'exhibition',divisions:[{id:'EXH',country:'EXH',tier:1,clubs:clubs.map(c=>c.id)}]};
