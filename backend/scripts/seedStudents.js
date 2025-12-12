require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const { MONGO_URI } = require('../config');

// Easy password for all students (change this if needed)
const defaultPassword = 'sw2027';

// ============================================
// STUDENT DATA - Edit this array to add your students
// ============================================
const students = [
  { name: 'Kanishka Sathiyanathan', email: 'sathiyanaathan14@gmail.com', admissionNo: '20001', classIds: [] },
  { name: 'SATHEESKUMAR SURENUJAA', email: 'satheeskumaar1234@gmail.com', admissionNo: '20002', classIds: [] },
  { name: 'Sivananthan Ashdalaxshika', email: 'anjulaxshi@gmail.com', admissionNo: '20003', classIds: [] },
  { name: 'VETHISA', email: 'vasanthanvaraleetha@gmail.com', admissionNo: '20004', classIds: [] },
  { name: 'Jeyakumar Pirathagini', email: 'jaso1309@gmail.com', admissionNo: '20005', classIds: [] },
  { name: 'Thiruchelvam Tharmithan', email: 'Thiruchelvamtharmithan3@gmail.com', admissionNo: '20007', classIds: [] },
  { name: 'Navaneethan Aathy', email: 'nvaa1979@gmail.com', admissionNo: '20008', classIds: [] },
  { name: 'Shapthaki Senthoran', email: 'shapthisentho07@gmail.com', admissionNo: '20009', classIds: [] },
  { name: 'Vinotharan Vishalini', email: 'vinotharanvishalini8@gmail.com', admissionNo: '20010', classIds: [] },
  { name: 'Harshaa Nishanthan', email: 'nishanthankamalapatham@gmail.com', admissionNo: '20011', classIds: [] },
  { name: 'Yashini Davidsujeendrathas', email: 'yasdavid2008@gmail.com', admissionNo: '20012', classIds: [] },
  { name: 'Yoganathan Vishali', email: 'yvishali2008@gmail.com', admissionNo: '20013', classIds: [] },
  { name: 'Gnanaruban.Jathushikan', email: 'jathushikan21062008@gmail.com', admissionNo: '20016', classIds: [] },
  { name: 'M.Thanulakshan', email: 'kathikamapodymeharasa@gmail.com', admissionNo: '20019', classIds: [] },
  { name: 'R.Shanjeevan', email: 'ragavanshanjeevan1828@gmail.com', admissionNo: '20020', classIds: [] },
  { name: 'T.Ilakkiya', email: 'Thamilchelvanilakkiya@gmail.com', admissionNo: '20021', classIds: [] },
  { name: 'R.F.Sadha', email: 'nkrais9@gmail.com', admissionNo: '20023', classIds: [] },
  { name: 'Rajamohan seyon', email: 'rajamohanseyon032@gmail.com', admissionNo: '20024', classIds: [] },
  { name: 'Srisankar Arunothan', email: 'arunothans@gmail.com', admissionNo: '20025', classIds: [] },
  { name: 'Ravichandran Niveksi', email: 'ravikandaiya661@gmail.com', admissionNo: '20026', classIds: [] },
  { name: 'Thulabha Elangovan', email: 'thulabhaelango@gmail.com', admissionNo: '20028', classIds: [] },
  { name: 'Satheeswaran Kavishan', email: 'satheeswaransatheeswaran961@gmail.com', admissionNo: '20029', classIds: [] },
  { name: 'Kanthiraj Anurdika', email: 'aarabividya@gmail.com', admissionNo: '20034', classIds: [] },
  { name: 'Mohamed Ashif', email: 'ashifrohan16@gmail.com', admissionNo: '20035', classIds: [] },
  { name: 'Raveendrakumaran Sirivarshan', email: 'varsharaveendrakumaran@gmail.com', admissionNo: '20036', classIds: [] },
  { name: 'Sivaharshini Sivanarulselvan', email: 'Sivanathan1941nathan@gmail.com', admissionNo: '20037', classIds: [] },
  { name: 'MURUGANANTHAN PRAVEEN', email: 'vithyamuruka@gmail.com', admissionNo: '20039', classIds: [] },
  { name: 'Uthayasooriyan Pranya', email: 'pranthej54@gmail.com', admissionNo: '20041', classIds: [] },
  { name: 'Kandeepan Kishalini', email: 'kandeepankishalini@gmail.com', admissionNo: '20042', classIds: [] },
  { name: 'Ragaventhan Proshithan', email: 'luxshipaskaran@gmail.com', admissionNo: '20043', classIds: [] },
  { name: 'Anton Jeyakumar Bustian Paulraj', email: 'antonpaulraj1437@gmail.com', admissionNo: '20045', classIds: [] },
  { name: 'Kohularaj Pathumithan', email: 'kohularajsuyarathy@gmail.com', admissionNo: '20046', classIds: [] },
  { name: 'Pious Piula', email: 'mrs.pushpapious@gmail.com', admissionNo: '20047', classIds: [] },
  { name: 'Manimaran Sashmitha Swethni', email: 'sashmithaswethni06@gmail.com', admissionNo: '20048', classIds: [] },
  { name: 'Jekaran Sharmini', email: 'sharminijekaran11@gmail.com', admissionNo: '20049', classIds: [] },
  { name: '20050 Srinivasan.Aatheesh', email: 'sriaatheeshjk@gmail.com', admissionNo: '20050', classIds: [] },
  { name: 'Livijaa Elavalagan', email: 'livijaa2008@gmail.com', admissionNo: '20051', classIds: [] },
  { name: 'B.Yamshana', email: 'Yamshana.b@gmail.com', admissionNo: '20053', classIds: [] },
  { name: 'Tharmika Sritharan', email: 'tharmikasritharan30@gmail.com', admissionNo: '20054', classIds: [] },
  { name: 'Koshajini', email: 'Koshajinikosha@gmail.com', admissionNo: '20056', classIds: [] },
  { name: 'Abinaya Kokilan', email: 'k.kokilan@icloud.com', admissionNo: '20057', classIds: [] },
  { name: 'Thavakumar Piremashaini', email: 'thavakumarpiremashaini@gmail.com', admissionNo: '20058', classIds: [] },
  { name: 'Apatitha Raveendiran', email: 'apatitha@gmail.com', admissionNo: '20059', classIds: [] },
  { name: 'Bianca Manuelpillai', email: 'biancajulian698@gmail.com', admissionNo: '20060', classIds: [] },
  { name: 'R S Shadha', email: 'ShazninShadha@gmail.com', admissionNo: '20063', classIds: [] },
  { name: 'Al Haamith', email: 'alhaamith21215@gmail.com', admissionNo: '20064', classIds: [] },
  { name: 'Alosiyas Januskar', email: 'yuva8275@gmail.com', admissionNo: '20067', classIds: [] },
  { name: 'Dakshaya Jaibhramman', email: 'jaibhrammandakshaya@gmail.com', admissionNo: '20068', classIds: [] },
  { name: 'Musara Raseem', email: 'musararaseem@gmail.com', admissionNo: '20069', classIds: [] },
  { name: 'Sanaadanan Sitparan', email: 'sanaadanan2008@gmail.com', admissionNo: '20070', classIds: [] },
  { name: 'Shathana Puviraj', email: 'shathusha10134@gmail.com', admissionNo: '20072', classIds: [] },
  { name: 'Pratheep brunthesh', email: 'bruntheshpradeep@gmail.com', admissionNo: '20073', classIds: [] },
  { name: 'Monisha', email: 'Monishamonisham2008@gmail.com', admissionNo: '20075', classIds: [] },
  { name: 'Prithiha', email: 'denigiyajohnson20@gmail.com', admissionNo: '20077', classIds: [] },
  { name: 'Kajaani', email: 'vithukajani2021@gmail.com', admissionNo: '20078', classIds: [] },
  { name: 'AHAMED', email: 'areef1232008@gmail.com', admissionNo: '20080', classIds: [] },
  { name: 'Abinaya Ravikaran', email: 'Abinayaravikaran@gmail.com', admissionNo: '20082', classIds: [] },
  { name: 'Mohamed Sabdeen Fathima Amna', email: 'fathima20087amna@gmail.com', admissionNo: '20084', classIds: [] },
  { name: 'Mylvakanam Thansuraby', email: 'mylvakanamsulaxshan@gmail.com', admissionNo: '20085', classIds: [] },
  { name: 'Gaayathiri Gajendiran', email: 'gowrygajan@gmail.com', admissionNo: '20087', classIds: [] },
  { name: 'Aarany pratheepan', email: 'aaranyprathe@gmail.com', admissionNo: '20088', classIds: [] },
  { name: 'KONESWARAN KANAVIYAS', email: 'kanaviyask@gmail.com', admissionNo: '20089', classIds: [] },
  { name: 'Paramalingam Sapiththa', email: 'menushamenu201807@gmail.com', admissionNo: '20091', classIds: [] },
  { name: '(J.Merijah)', email: 'Thayananthijeyanathan@gmail.com', admissionNo: '20093', classIds: [] },
  { name: 'Gnanapirakasam Akshaya', email: 'luthumaryakshaya@gmail.com', admissionNo: '20094', classIds: [] },
  { name: 'Fathima Fikra', email: 'fikralamha@gmail.com', admissionNo: '20095', classIds: [] },
  { name: 'Sasikanth Tharunjan', email: 'khuhatharun@gmail.com', admissionNo: '20096', classIds: [] },
  { name: 'Viiththiyananthan Mevarsshi', email: 'vmevarsshi@gmail.com', admissionNo: '20099', classIds: [] },
  { name: 'Mithursha Vasanthakumar', email: 'mithurshamithush@gmail.com', admissionNo: '20100', classIds: [] },
  { name: 'Mohamed Kaiz', email: 'mohamedkaiz999@gmail.com', admissionNo: '20102', classIds: [] },
  { name: 'Kithushani pushpaharan', email: 'sahayamsahayam525@gmail.com', admissionNo: '20103', classIds: [] },
  { name: 'Ketheeswaran Kathirnilavan', email: 'nilavan3k@gmail.com', admissionNo: '20104', classIds: [] },
  { name: 'ravindrakumar lukshan', email: '2008lukshan@gmail.com', admissionNo: '20105', classIds: [] },
  { name: 'Kumarakuruparan branavi', email: 'kumarakuruparanbranavi@gmail.com', admissionNo: '20107', classIds: [] },
  { name: 'MurugiahPranoojan', email: 'lahinthmurugiah@gmail.com', admissionNo: '20108', classIds: [] },
  { name: 'Advaitha Theiventhirakumar', email: 'aathmikumar@gmail.com', admissionNo: '20109', classIds: [] },
  { name: 'Sibikka Sivaneswaran', email: 'sivanesan1w3@gmail.com', admissionNo: '20110', classIds: [] },
  { name: 'PIRATHEEPAN SARANITHAN', email: 'psaranithan@gmail.com', admissionNo: '20113', classIds: [] },
  { name: 'ABISHALINI PHILIPTHEVASEELAN', email: 'abishalini2008@gmail.com', admissionNo: '20114', classIds: [] },
  { name: 'Yathumitha', email: 'rigeamalanayaki1@gmail.com', admissionNo: '20115', classIds: [] },
  { name: 'Mubarak Samra', email: 'Geofilmsmm2018@gmail.com', admissionNo: '20117', classIds: [] },
  { name: 'Sasi kumar kenuja', email: 'sujasasi84@gmail.com', admissionNo: '20118', classIds: [] },
  { name: 'Jegan Jeevaraj Jeshanth', email: 'jjjeshanth@gmail.com', admissionNo: '20122', classIds: [] },
  { name: 'Koneshwaran Sukirththanan', email: 'sukirththananbaba@gmail.com', admissionNo: '20123', classIds: [] },
  { name: 'Abivarshi Jeevakumar', email: 'abivarshi1973@gmail.com', admissionNo: '20126', classIds: [] },
  { name: 'Riththy Rajeev', email: 'riththyrajeev3@gmail.com', admissionNo: '20127', classIds: [] },
  { name: 'Kunajeevan Varshan', email: 'vvarshan779@gmail.com', admissionNo: '20128', classIds: [] },
  { name: 'Kuberan Naaranie', email: 'naaranie.batti27@gmail.com', admissionNo: '20129', classIds: [] },
  { name: 'Hussair Simlaa', email: 'hussairsimlaa@gmail.com', admissionNo: '20132', classIds: [] },
  { name: 'yansika manokaran', email: 'yansimanokar4424@gmail.com', admissionNo: '20135', classIds: [] },
  { name: 'KaimanHarish', email: 'kaimanharish9830@gmail.com', admissionNo: '20136', classIds: [] },
  { name: 'Sivakumar shaaruhan', email: 'shaarurocks2008@gmail.com', admissionNo: '20137', classIds: [] },
  { name: 'Kajoliny Ketheeswaran', email: 'kethees246@gmail.com', admissionNo: '20141', classIds: [] },
  { name: 'Taranika Umakanthan', email: 'umanirmala79@gmail.com', admissionNo: '20142', classIds: [] },
  { name: 'Pavanantham Bavisan', email: 'p.bavisan@gmail.com', admissionNo: '20144', classIds: [] },
  { name: 'Subesana Kugapalan', email: 'nanthakukan@gmail.com', admissionNo: '20145', classIds: [] },
  { name: 'Danish Prathikshana', email: 'danishshangary77@gmail.com', admissionNo: '20147', classIds: [] },
  { name: 'KENATH MADHU SHERIN LASIKA KIMSUMI', email: 'madonakenath@gmail.com', admissionNo: '20148', classIds: [] },
  { name: 'KeerthanaRupan', email: 'engrupan@gmail.Com', admissionNo: '20150', classIds: [] },
  { name: 'MF.Manha', email: 'rishanamansoor6@gmail.com', admissionNo: '20151', classIds: [] },
  { name: 'Amsana Perinpasivam', email: 'amsana2008@gmail.com', admissionNo: '20152', classIds: [] },
  { name: 'Murali Raamanujann', email: 'raam241108@gmail.com', admissionNo: '20153', classIds: [] },
  { name: 'Subendran Sikamsan', email: 'Sikamsan08@gmail.com', admissionNo: '20155', classIds: [] },
  { name: 'Vimalrajah Kemavarshini', email: 'kemavarshinikema@gmail.com', admissionNo: '20156', classIds: [] },
  { name: 'Rasu Braveen', email: 'rasubraveen2@gmail.com', admissionNo: '20159', classIds: [] },
  { name: 'Maathummy Suthakaran', email: 'sujithrasuhaharan@gmail.com', admissionNo: '20161', classIds: [] },
  { name: 'Santhakumar samaravan', email: 'riya961115@gmail.com', admissionNo: '20162', classIds: [] },
  { name: 'AMRI MUNAWWAR', email: 'brothersasa28@gmail.com', admissionNo: '20163', classIds: [] },
  { name: 'Jesuran Prem diluxan', email: 'jesuran77@gmail.com', admissionNo: '20166', classIds: [] },
  { name: 'Sivarajah Acsharan', email: 'acsharansivarajah@gmail.com', admissionNo: '20167', classIds: [] },
  { name: 'Sarvananthan Janarthanan', email: 'sarvananthanjanarthanan@gmail.com', admissionNo: '20168', classIds: [] },
  { name: 'ACHCHIMOHAMMETH MOHAMMED ABZAR', email: 'mohammedabzar2008@gmail.com', admissionNo: '20171', classIds: [] },
  { name: 'Mohomed Gadafi Aneef Ahamath', email: 'aneefahamath2008@gmail.com', admissionNo: '20172', classIds: [] },
  { name: 'Ravichandran Aswini', email: 'ravichandranpusparajani@gmail.com', admissionNo: '20173', classIds: [] },
  { name: 'Kavishalini Paramanantham', email: 'kavishaliniparamanantham@gmail.com', admissionNo: '20174', classIds: [] },
  { name: 'Nesanathan Gawshiga', email: 'gawshiganesanathan@gmail.com', admissionNo: '20175', classIds: [] },
  { name: 'Aarthmi Sitsabeshan', email: 'Shathuja0901@gmail.com', admissionNo: '20177', classIds: [] },
  { name: 'Pavitha Rasakumaran', email: 'abik5229@gmail.com', admissionNo: '20178', classIds: [] },
  { name: 'Jharukshi Villbar Satheeskumar', email: 'jharu2008@gmail.com', admissionNo: '20180', classIds: [] },
  { name: 'FZ.Hikma', email: 'fzhikma8@gmail.com', admissionNo: '20181', classIds: [] },
  { name: 'Harithas Thiviyathas', email: 'shapethasshapetha@gmail.com', admissionNo: '20182', classIds: [] },
  { name: 'Mislaff Ahamed', email: 'mislaff46@gmail.com', admissionNo: '20183', classIds: [] },
  { name: 'M.Lithurshana', email: 'Lithurshana26@gmail.com', admissionNo: '20184', classIds: [] },
  { name: 'Dishopika Sureshkumar', email: 'dishopikasureshkumar1301@gmail.com', admissionNo: '20186', classIds: [] },
  { name: 'Srikugan Adsaya', email: 'adsaya1612@gmail.com', admissionNo: '20188', classIds: [] },
  { name: 'Pirruthvika Srinivasu', email: 'lsrinivasu20@gmail.com', admissionNo: '20190', classIds: [] },
  { name: 'Fathima Akeedha', email: 'onlinestudysrilanka@gmail.com', admissionNo: '20191', classIds: [] },
  { name: 'Pirasna Raveendran', email: 'shathuri099@gmail.com', admissionNo: '20192', classIds: [] },
  { name: 'kishaniya saththeeswaran', email: 'kishasaththeeswaran123@gmail.com', admissionNo: '20194', classIds: [] },
  { name: 'Shruthika Mathivannan', email: 'mathykachcheri@gmail.com', admissionNo: '20195', classIds: [] },
  { name: 'Shageethra Shangar', email: 'shagee.1st@gmail.com', admissionNo: '20196', classIds: [] },
  { name: 'ARULANANDHAN ABINESH', email: 'arulanandhannagu275@gmail.com', admissionNo: '20197', classIds: [] },
  { name: 'Kubethini Udayakumar', email: 'kubethiniudayakumar@gmail.com', admissionNo: '20198', classIds: [] },
  { name: 'Joe Brighton Fernando', email: 'brightonfernando1203@gmail.com', admissionNo: '20199', classIds: [] },
  { name: 'Nalliah Vishnujan', email: 'yasothay05@gmail.com', admissionNo: '20200', classIds: [] },
  { name: 'Anton Messiyas Vaakeeshan', email: 'thanushiva45@gmail.com', admissionNo: '20201', classIds: [] },
  { name: 'Mohamed Nijam Noori', email: 'nm2584484@gmail.com', admissionNo: '20202', classIds: [] },
  { name: 'Seshangithaa Thayakaran', email: 'thayakaran2211@gmail.com', admissionNo: '20203', classIds: [] },
  { name: 'Kuhatharan Jathusheck', email: 'jathusheck082008@gmail.com', admissionNo: '20220', classIds: [] },
  { name: 'Sasikumar Sanjey', email: 'sasikumarkosala@gmail.com', admissionNo: '20221', classIds: [] },
  { name: 'Afras', email: 'mamafrasahama82008@gmail.com', admissionNo: '20222', classIds: [] },
  { name: 'Shaemahi Jeyatheeswaran', email: 'Vidyajeya1983@gmail.com', admissionNo: '20223', classIds: [] },
  { name: 'Vijayakumar Mathushiya', email: 'oviyavijayakumar91@gmail.com', admissionNo: '20224', classIds: [] },
  { name: 'Kiritharan varnika', email: 'varni0215@gmail.com', admissionNo: '20227', classIds: [] },
  { name: 'Muraleesparan Khirushnavhi', email: 'muraliuma865@gmail.com', admissionNo: '20229', classIds: [] },
  { name: 'Nawaraja Shulakmi', email: 'nawarajanawaraja5@gmail.com', admissionNo: '20230', classIds: [] },
  { name: 'Omesh Suresh', email: 'omeshsuresh757@gmail.com', admissionNo: '20231', classIds: [] },
  { name: 'koshia baskaran', email: 'baskarankoshia@gmail.com', admissionNo: '20232', classIds: [] },
  { name: 'Chrishera Sherine Sritharan', email: 'ehamparamsritharan1967@gmail.com', admissionNo: '20233', classIds: [] },
  { name: 'Kithani Kohilan', email: 'ksathya014@gmail.com', admissionNo: '20235', classIds: [] },
  { name: 'B.A.Ahamed Nuhath', email: 'ahamednuhath209@gmail.com', admissionNo: '20236', classIds: [] },
  { name: 'Sathiyanathan Yathushana', email: 'sathiyauthaya76@gmail.com', admissionNo: '20237', classIds: [] },
  { name: 'Kannathasan Varza', email: 'kannathasanvarza@gmail.com', admissionNo: '20238', classIds: [] },
  { name: 'NARUN.Q', email: 'narun.nancyquinton@gmail.com', admissionNo: '20239', classIds: [] },
  { name: 'Mohamed Zhubair Aila Maryam', email: 'zhubairzubair@gmail.com', admissionNo: '20240', classIds: [] },
  { name: 'John bosco mary jonilda', email: 'jmaryjonildajoni@gmail.com', admissionNo: '20241', classIds: [] },
  { name: 'Prinston Joe', email: 'nishanthirodrico5@gmail.com', admissionNo: '20243', classIds: [] },
  { name: 'Nithuna Varatharasa', email: 'vnithuna96@gmail.com', admissionNo: '20244', classIds: [] },
];

// Optional: If you want to assign all students to a specific class
// First, create the class in the admin panel, then get its ID and use it here
// const defaultClassId = 'YOUR_CLASS_ID_HERE'; // Leave empty if not assigning to class

async function seedStudents() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🌱 Starting student seeding...\n');

    if (students.length === 0) {
      console.log('⚠️  No students to seed. Please add students to the array in seedStudents.js');
      await mongoose.disconnect();
      process.exit(0);
    }

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (const studentData of students) {
      try {
        const { name, email, admissionNo, classIds = [] } = studentData;

        if (!name || !email) {
          results.errors.push({
            data: studentData,
            reason: 'Name and email are required'
          });
          continue;
        }

        // Check if email already exists
        const existingByEmail = await User.findOne({ email: email.toLowerCase().trim(), role: 'student' });
        if (existingByEmail) {
          results.skipped.push({
            name,
            email,
            reason: 'Email already exists'
          });
          continue;
        }

        // Check if admissionNo already exists (if provided)
        if (admissionNo && admissionNo.trim()) {
          const existingByAdmission = await User.findOne({ 
            admissionNo: admissionNo.trim(), 
            role: 'student' 
          });
          if (existingByAdmission) {
            results.skipped.push({
              name,
              email,
              admissionNo,
              reason: 'Admission number already exists'
            });
            continue;
          }
        }

        // Validate classIds if provided
        let validClassIds = [];
        if (classIds && classIds.length > 0) {
          const classes = await Class.find({ _id: { $in: classIds } });
          validClassIds = classes.map(c => c._id);
          if (validClassIds.length !== classIds.length) {
            console.log(`⚠️  Warning: Some class IDs for ${name} are invalid`);
          }
        }

        // Create student
        const student = await User.create({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: defaultPassword, // Will be hashed by model hook
          role: 'student',
          admissionNo: admissionNo ? admissionNo.trim() : undefined,
          classIds: validClassIds
        });

        // Update classes with student
        if (validClassIds.length > 0) {
          await Class.updateMany(
            { _id: { $in: validClassIds } },
            { $addToSet: { students: student._id } }
          );
        }

        results.created.push({
          name: student.name,
          email: student.email,
          admissionNo: student.admissionNo || 'N/A',
          id: student._id
        });

        console.log(`✅ Created: ${name} (${email})`);
      } catch (error) {
        results.errors.push({
          data: studentData,
          reason: error.message
        });
        console.error(`❌ Error creating ${studentData.name}:`, error.message);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${results.created.length} students`);
    console.log(`⏭️  Skipped: ${results.skipped.length} students`);
    console.log(`❌ Errors: ${results.errors.length} students`);
    console.log('\n📝 Default Password for all students:', defaultPassword);
    
    if (results.created.length > 0) {
      console.log('\n✅ Successfully Created Students:');
      results.created.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} - ${s.email} (Admission: ${s.admissionNo})`);
      });
    }

    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Students (already exist):');
      results.skipped.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} - ${s.email} (Reason: ${s.reason})`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${JSON.stringify(e.data)} - ${e.reason}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  } catch (err) {
    console.error('❌ Failed to seed students:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedStudents();

