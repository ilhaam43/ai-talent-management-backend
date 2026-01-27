import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding job vacancies...\n');

    // Get required reference data
    const positions = {
        officer: await prisma.employeePosition.findFirst({ where: { employeePosition: 'OFFICER' } }),
        seniorOfficer: await prisma.employeePosition.findFirst({ where: { employeePosition: 'SENIOR OFFICER' } }),
        engineer: await prisma.employeePosition.findFirst({ where: { employeePosition: 'ENGINEER' } }),
        seniorEngineer: await prisma.employeePosition.findFirst({ where: { employeePosition: 'SENIOR ENGINEER' } }),
    };

    const durations = {
        days30: await prisma.jobVacancyDuration.findFirst({ where: { daysDuration: 30 } }),
        days60: await prisma.jobVacancyDuration.findFirst({ where: { daysDuration: 60 } }),
    };

    const employmentTypes = {
        pkwtt: await prisma.employmentType.findFirst({ where: { employmentType: 'PKWTT' } }),
    };

    const jobVacancyStatus = await prisma.jobVacancyStatus.findFirst({ where: { jobVacancyStatus: 'OPEN' } });
    const jobVacancyReason = await prisma.jobVacancyReason.findFirst({ where: { reason: 'New Position' } });

    // Get divisions by name
    const divisions = {
        telcoServices: await prisma.division.findFirst({
            where: { divisionName: 'Infrastructure Solution' },
            include: { directorate: true, group: true }
        }),
        cybersecurity: await prisma.division.findFirst({
            where: { divisionName: 'Cybersecurity Delivery and Operation' },
            include: { directorate: true, group: true }
        }),
        cloud: await prisma.division.findFirst({
            where: { divisionName: 'Cloud Delivery and Operation' },
            include: { directorate: true, group: true }
        }),
        itServices: await prisma.division.findFirst({
            where: { divisionName: 'Collaboration Solution' },
            include: { directorate: true, group: true }
        }),
        strategy: await prisma.division.findFirst({
            where: { divisionName: 'Strategy and Business Development' },
            include: { directorate: true, group: true }
        }),
        ceoOffice: await prisma.division.findFirst({
            where: { divisionName: 'CEO Office' },
            include: { directorate: true, group: true }
        }),
        financial: await prisma.division.findFirst({
            where: { divisionName: 'Finance' },
            include: { directorate: true, group: true }
        }),
        humanResources: await prisma.division.findFirst({
            where: { divisionName: 'Human Capital Strategy and Experience' },
            include: { directorate: true, group: true }
        }),
        fsiDigitalCompanies: await prisma.division.findFirst({
            where: { divisionName: 'FSI and Digital Companies Account' },
            include: { directorate: true, group: true }
        }),
    };

    // Get departments
    const departments = {
        connectivity: await prisma.department.findFirst({ where: { departmentName: 'Connectivity Solution' } }),
        cloudEngineering: await prisma.department.findFirst({ where: { departmentName: 'Cloud Engineering' } }),
        cybersecurityDelivery: await prisma.department.findFirst({ where: { departmentName: 'Cybersecurity Delivery and Customer Operation' } }),
        collaboration: await prisma.department.findFirst({ where: { departmentName: 'Collaboration Product Consultant' } }),
        businessStrategy: await prisma.department.findFirst({ where: { departmentName: 'Business Strategy' } }),
        corporateComm: await prisma.department.findFirst({ where: { departmentName: 'Corporate Communication' } }),
        financialPlanning: await prisma.department.findFirst({ where: { departmentName: 'Financial Planning and Controlling' } }),
        peopleServices: await prisma.department.findFirst({ where: { departmentName: 'People Services' } }),
        itProfessionalServices: await prisma.department.findFirst({ where: { departmentName: 'IT Professional Services' } }),
        fsiAccount1: await prisma.department.findFirst({ where: { departmentName: 'FSI and Digital Companies Account 1' } }),
    };

    // Get job roles
    const jobRoles = {
        networkEngineer: await prisma.jobRole.findFirst({ where: { jobRoleName: 'NETWORK ENGINEER' } }),
        backendEngineer: await prisma.jobRole.findFirst({ where: { jobRoleName: 'BACKEND SOFTWARE ENGINEER' } }),
        frontendEngineer: await prisma.jobRole.findFirst({ where: { jobRoleName: 'FRONTEND SOFTWARE ENGINEER' } }),
        devOpsEngineer: await prisma.jobRole.findFirst({ where: { jobRoleName: 'DEVOPS ENGINEER' } }),
        dataAnalyst: await prisma.jobRole.findFirst({ where: { jobRoleName: 'DATA ANALYST' } }),
        itSupport: await prisma.jobRole.findFirst({ where: { jobRoleName: 'IT SUPPORT ENGINEER' } }),
        hrSpecialist: await prisma.jobRole.findFirst({ where: { jobRoleName: 'HUMAN RESOURCES GENERALIST' } }),
        financialAnalyst: await prisma.jobRole.findFirst({ where: { jobRoleName: 'FINANCIAL ANALYST' } }),
        businessAnalyst: await prisma.jobRole.findFirst({ where: { jobRoleName: 'BUSINESS ANALYST' } }),
        penetrationTester: await prisma.jobRole.findFirst({ where: { jobRoleName: 'PENETRATION TESTER' } }),
        qaEngineer: await prisma.jobRole.findFirst({ where: { jobRoleName: 'QUALITY ASSURANCE ENGINEER' } }),
        accountManager: await prisma.jobRole.findFirst({ where: { jobRoleName: 'ACCOUNT MANAGER' } }),
    };

    // Define job vacancies data
    const jobVacancies = [
        // Telco Services Division - Network positions
        {
            jobRoleId: jobRoles.networkEngineer?.id,
            employeePositionId: positions.engineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.telcoServices?.id,
            directorateId: divisions.telcoServices?.directorateId,
            groupId: divisions.telcoServices?.groupId,
            departmentId: departments.connectivity?.id,
            jobRequirement: 'Bachelor degree in Telecommunications, Computer Engineering. 2+ years experience. Proficient in Routing/Switching (Cisco/Juniper/Huawei). Skills: OSPF, BGP, VLANs, STP. Tools: Wireshark, GNS3, Puppet/Ansible for network automation.',
            jobDescription: 'Implement network solutions for telco infrastructure. Configure and troubleshoot routers/switches. Monitor network traffic using SolarWinds/Nagios. automate configuration tasks using Ansible/Python scripts.',
            cityLocation: 'Jakarta',
            minSalary: 8000000,
            maxSalary: 12000000,
            skills: ['OSPF', 'BGP', 'VLANs', 'STP', 'Wireshark', 'GNS3', 'Puppet', 'Ansible'],
        },
        {
            jobRoleId: jobRoles.networkEngineer?.id,
            employeePositionId: positions.seniorEngineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.telcoServices?.id,
            jobRequirement: 'Bachelor degree in Telecommunications. 5+ years experience. Expert in MPLS, SD-WAN, QoS, and Network Security (Firewalls/VPN). Certifications: CCNP/CCIE. Tools: Cisco DNA, Riverbed, Splunk for analytics.',
            jobDescription: 'Lead network architecture design and optimization. Oversee SD-WAN implementation. Conduct network capacity planning and security audits. Mentor junior engineers in troubleshooting complex L2/L3 issues.',
            cityLocation: 'Jakarta',
            minSalary: 15000000,
            maxSalary: 22000000,
            skills: ['MPLS', 'SD-WAN', 'QoS', 'Network Security', 'Firewalls', 'VPN', 'Cisco DNA', 'Riverbed', 'Splunk'],
        },

        // Cybersecurity Division - Technical positions
        {
            jobRoleId: jobRoles.itSupport?.id,
            employeePositionId: positions.engineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.cybersecurity?.id,
            jobRequirement: 'Bachelor degree in InfoSec. 2+ years in SOC/Security Ops. Skills: Vulnerability Assessment, Incident Response. Tools: Nessus, Metasploit, Wireshark, Antivirus management consoles.',
            jobDescription: 'Monitor security alerts via SIEM. Perform regular vulnerability scans using Nessus. Assist in incident response containment. Maintain endpoint security systems.',
            cityLocation: 'Jakarta',
            minSalary: 9000000,
            maxSalary: 13000000,
            skills: ['Vulnerability Assessment', 'Incident Response', 'Nessus', 'Metasploit', 'Wireshark', 'Antivirus Management'],
        },
        {
            jobRoleId: jobRoles.itSupport?.id,
            employeePositionId: positions.seniorEngineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.cybersecurity?.id,
            jobRequirement: 'Bachelor degree in InfoSec. 5+ years experience. Expert in Threat Hunting, Forensics, and Penetration Testing. Certifications: CISSP, OSCP. Tools: Splunk/QRadar, EnCase, Burp Suite, Kali Linux.',
            jobDescription: 'Design security architecture and policies. Lead red/blue team exercises. Manage major security incidents and forensic investigations. Implement Zero Trust architecture.',
            cityLocation: 'Jakarta',
            minSalary: 16000000,
            maxSalary: 24000000,
            skills: ['Threat Hunting', 'Forensics', 'Penetration Testing', 'Splunk', 'QRadar', 'EnCase', 'Burp Suite', 'Kali Linux', 'Zero Trust'],
        },
        {
            jobRoleId: jobRoles.penetrationTester?.id,
            employeePositionId: positions.seniorEngineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.cybersecurity?.id,
            departmentId: departments.cybersecurityDelivery?.id,
            jobRequirement: "Bachelor's degree in Computer Science, Information Technology, Cybersecurity, or a related field. Minimum of 3 years of experience in penetration testing, with a proven track record of conducting advanced tests. Basic understanding of penetration testing techniques, tools, and methodologies. Familiarity with common penetration testing tools (e.g., Metasploit, Burp Suite, Nmap, Wireshark). Strong analytical and problem-solving skills. Good written and verbal communication skills. Ability to work collaboratively in a team-oriented environment. Eagerness to learn and adapt to new technologies and security practices. Basic knowledge of network protocols, operating systems, and security concepts. Detail-oriented with the ability to document findings accurately and thoroughly. Continuous willingness to stay updated with the latest security trends and technologies. Relevant certifications (e.g, OSCP, OSCE, CEH, CISSP) are highly desirable.",
            jobDescription: "Support penetration testing activities under the guidance of senior team members. Conduct basic penetration tests on networks, applications, and systems. Document preliminary findings and vulnerabilities identified during tests. Assist in developing and refining penetration test plans and methodologies. Stay informed about current security threats, vulnerabilities, and penetration testing tools. Collaborate with other security team members to address identified vulnerabilities. Participate in the analysis of penetration test results and provide input on potential impacts. Contribute to the creation of detailed reports and presentations for management and technical audiences. Assist in the development and maintenance of standard operating procedures for penetration testing.",
            cityLocation: 'Jakarta',
            minSalary: 18000000,
            maxSalary: 28000000,
            skills: ['Penetration Testing', 'Metasploit', 'Burp Suite', 'Nmap', 'Wireshark', 'Vulnerability Assessment'],
        },

        // Cloud Division - Technical positions
        {
            jobRoleId: jobRoles.devOpsEngineer?.id,
            employeePositionId: positions.engineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.cloud?.id,
            jobRequirement: 'Bachelor in CS. 2+ years in Cloud Ops. Skills: AWS/GCP, Docker, Bash/Python scripting. Tools: Terraform (Basic), Jenkins/GitLab CI, Prometheus/Grafana.',
            jobDescription: 'Manage cloud resources (EC2/S3/GKE). Write Terraform scripts for infrastructure provisioning. Maintain CI/CD pipelines. Monitor system metrics using Grafana.',
            cityLocation: 'Jakarta',
            minSalary: 10000000,
            maxSalary: 14000000,
            skills: ['AWS', 'GCP', 'Docker', 'Bash', 'Python', 'Terraform', 'Jenkins', 'GitLab CI', 'Prometheus', 'Grafana'],
        },
        {
            jobRoleId: jobRoles.backendEngineer?.id,
            employeePositionId: positions.seniorEngineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.cloud?.id,
            jobRequirement: 'Bachelor in CS. 5+ years in Cloud-Native Dev. Expert in Kubernetes (K8s), Helm, Istio, Serverless (Lambda/Functions). Skills: Go/Rust, Microservices Design patterns. Tools: ArgoCD, ELK Stack.',
            jobDescription: 'Architect scalable cloud-native applications on K8s. Implement Service Mesh with Istio. Design event-driven microservices. Optimize cloud costs and performance.',
            cityLocation: 'Jakarta',
            minSalary: 17000000,
            maxSalary: 25000000,
            skills: ['Kubernetes', 'Helm', 'Istio', 'Serverless', 'Lambda', 'Go', 'Rust', 'Microservices', 'ArgoCD', 'ELK Stack'],
        },

        // IT Services (Collaboration Solution) Division - Technical positions
        {
            jobRoleId: jobRoles.frontendEngineer?.id,
            employeePositionId: positions.engineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.itServices?.id,
            jobRequirement: 'Bachelor in CS. 2+ years Frontend Dev. Proficient in React.js, TypeScript, CSS3/SASS. Tools: Webpack, Redux/Zustand, Jest/React Testing Library, Figma (for implementation).',
            jobDescription: 'Build responsive UI components using React/TypeScript. Implement state management using Redux. Integrate REST/GraphQL APIs. Ensure pixel-perfect design implementation from Figma.',
            cityLocation: 'Jakarta',
            minSalary: 8500000,
            maxSalary: 12500000,
            skills: ['React.js', 'TypeScript', 'CSS3', 'SASS', 'Webpack', 'Redux', 'Zustand', 'Jest', 'React Testing Library', 'Figma'],
        },
        {
            jobRoleId: jobRoles.frontendEngineer?.id,
            employeePositionId: positions.seniorEngineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.itServices?.id,
            jobRequirement: 'Bachelor in CS. 5+ years Frontend Dev. Expert in Next.js, Web Performance, Micro-frontends. Skills: PWA, WebSockets, CI/CD for Frontend. Tools: Lighthouse, Vercel/Netlify, Cypress for E2E.',
            jobDescription: 'Architect frontend solutions using Next.js. Optimize Critical Rendering Path and Core Web Vitals. Design micro-frontend architecture. Mentor team on clean code and best practices.',
            cityLocation: 'Jakarta',
            minSalary: 16000000,
            maxSalary: 23000000,
            skills: ['Next.js', 'Web Performance', 'Micro-frontends', 'PWA', 'WebSockets', 'CI/CD', 'Lighthouse', 'Vercel', 'Netlify', 'Cypress'],
        },
        {
            jobRoleId: jobRoles.qaEngineer?.id,
            employeePositionId: positions.engineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.itServices?.id,
            departmentId: departments.itProfessionalServices?.id,
            jobRequirement: "Holds a minimum of a Bachelor's degree (S1), preferably in Information Technology–related fields such as Informatics Engineering, Computer Science, Information Management, Computer Engineering, Information Systems, or equivalent. Able to understand application development documents and translate them into testing activities based on predefined testing scenarios. Proficient in performance testing concepts, including test plans, test cases, DR testing, and performance testing. Has a minimum of 3 (three) years of experience as a Performance Tester in application development projects. Experienced in using performance testing tools such as Apache JMeter, Postman, Selenium, NeoLoad, or IBM Rational Performance Tester, and has a good understanding of general IT infrastructure configurations. Preferably able to communicate effectively in both Indonesian and English.",
            jobDescription: "Execute performance testing activities on applications and/or infrastructure in accordance with defined testing scenarios. Develop performance testing scripts based on testing scenarios. Document testing processes using the customer's ADLM and/or defect management system. Evaluate and monitor testing results and findings in a detailed and comprehensive manner, and ensure corrective actions have been properly implemented by developers. Prepare progress reports and final reports on application and/or infrastructure performance testing activities. Provide support for other tasks related to the development of Digital Technology Assets. Willing to be assigned at Lintasarta customer sites in Jakarta, specifically within the banking sector. Willing to be engaged under a Project-Based Fixed-Term Employment Contract (PKWT) with Lintasarta. Willing to work fully on-site (WFO) at Lintasarta customer locations.",
            cityLocation: 'Jakarta',
            minSalary: 10000000,
            maxSalary: 15000000,
            skills: ['Apache JMeter', 'Postman', 'Selenium', 'NeoLoad', 'Performance Testing', 'Test Plans', 'Test Cases'],
        },
        {
            jobRoleId: jobRoles.itSupport?.id,
            employeePositionId: positions.engineer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.itServices?.id,
            departmentId: departments.itProfessionalServices?.id,
            jobRequirement: "Minimum Bachelor's degree (S1) in Information Systems, Informatics Engineering, Computer Science, or related fields. Minimum 1 year of experience in IT Support / IT Helpdesk. Knowledge of technologies such as Microsoft Active Directory, Office 365, with strong proficiency in Microsoft Excel being an advantage. Experience in areas such as Storage Area Networks (SAN), WAN acceleration, virtualization, firewalls, routers, and related technologies. Experience in Backup Applications. Experience and knowledge in IT Asset Management and IT Service Management (ITSM), preferably with ITIL Foundation exposure. Experience in managing LAN cabling projects. Willing to be assigned to banking industry customers located in Jakarta. Willing to work in shifts.",
            jobDescription: "Handle user technical issues related to hardware, software, and network systems. Perform installation, configuration, and troubleshooting of IT equipment. Provide daily technical support (on-site and/or remote). Record, track, and follow up on incident tickets or issue reports. Coordinate and escalate issues to relevant teams when necessary. Understand and have hands-on experience implementing IT Service Management (ITSM). Experience using HR applications and/or ERP systems. Experience using Payment Systems applications and/or Core Banking Systems.",
            cityLocation: 'Jakarta',
            minSalary: 7000000,
            maxSalary: 11000000,
            skills: ['Microsoft Active Directory', 'Office 365', 'Microsoft Excel', 'SAN', 'WAN Acceleration', 'Virtualization', 'Firewalls', 'Routers', 'Backup Applications', 'IT Asset Management', 'ITSM', 'ITIL Foundation', 'LAN Cabling'],
        },

        // Strategy and Business Development Division - Non-technical positions
        {
            jobRoleId: jobRoles.businessAnalyst?.id,
            employeePositionId: positions.officer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.strategy?.id,
            jobRequirement: 'Bachelor in Business/Economics. 2+ years experience. Skills: Market Research, Financial Basics, SWOT Analysis. Tools: Excel (Pivot/VLOOKUP), PowerPoint, Google Analytics.',
            jobDescription: 'Conduct market research and competitor analysis. Assist in feasibility studies. Prepare presentation decks for management. Analyze business performance metrics.',
            cityLocation: 'Jakarta',
            minSalary: 7000000,
            maxSalary: 10000000,
            skills: ['Market Research', 'Financial Basics', 'SWOT Analysis', 'Excel', 'Pivot Tables', 'PowerPoint', 'Google Analytics'],
        },
        {
            jobRoleId: jobRoles.businessAnalyst?.id,
            employeePositionId: positions.seniorOfficer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.strategy?.id,
            jobRequirement: 'MBA preferred. 5+ years experience. Expert in Corporate Strategy, M&A, Financial Modeling. Skills: Strategic Planning, Stakeholder Management. Tools: Tableau/PowerBI, SPSS/SAS.',
            jobDescription: 'Lead strategic planning cycles. Evaluate M&A opportunities and partnerships. Develop comprehensive business plans using advanced financial models. Present strategic recommendations to C-level.',
            cityLocation: 'Jakarta',
            minSalary: 14000000,
            maxSalary: 20000000,
            skills: ['Corporate Strategy', 'M&A', 'Financial Modeling', 'Strategic Planning', 'Stakeholder Management', 'Tableau', 'PowerBI', 'SPSS', 'SAS'],
        },

        // CEO Office Division - Non-technical positions
        {
            jobRoleId: jobRoles.businessAnalyst?.id,
            employeePositionId: positions.officer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.ceoOffice?.id,
            jobRequirement: 'Bachelor in Communications/Business. 2+ years experience. Skills: Corporate Comm, Event Management. Tools: MS Office Suite, Zoom/Teams management, Project Management tools (Trello/Asana).',
            jobDescription: 'Draft executive communications and memos. Coordinate town halls and executive meetings. Track action items from BOD meetings. Support special projects for the CEO.',
            cityLocation: 'Jakarta',
            minSalary: 7500000,
            maxSalary: 11000000,
            skills: ['Corporate Communications', 'Event Management', 'Microsoft Office', 'Zoom', 'Teams', 'Trello', 'Asana'],
        },
        {
            jobRoleId: jobRoles.businessAnalyst?.id,
            employeePositionId: positions.seniorOfficer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.ceoOffice?.id,
            jobRequirement: 'Master degree preferred. 5+ years experience. Skills: Investor Relations, Crisis Management, Strategic Advisory. Tools: Bloomberg Terminal familiarity, Advanced Presentation tools.',
            jobDescription: 'Manage investor relations and external stakeholder communication. Advise CEO on strategic issues. Oversee critical CEO office initiatives and crisis communication strategies.',
            cityLocation: 'Jakarta',
            minSalary: 15000000,
            maxSalary: 21000000,
            skills: ['Investor Relations', 'Crisis Management', 'Strategic Advisory', 'Bloomberg Terminal', 'Presentation Skills'],
        },

        // Financial Division - Non-technical positions
        {
            jobRoleId: jobRoles.financialAnalyst?.id,
            employeePositionId: positions.officer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.financial?.id,
            jobRequirement: 'Bachelor in Accounting/Finance. 2+ years experience. Skills: GL reconciliation, Budgeting, Tax regulation (Brevet A/B). Tools: SAP/Oracle (FICO module), Excel (Macros).',
            jobDescription: 'Handle daily journal entries and GL reconciliation. Assist in monthly/yearly closing. Prepare tax reports (PPh/PPN). Support budget preparation process.',
            cityLocation: 'Jakarta',
            minSalary: 7000000,
            maxSalary: 10500000,
            skills: ['GL Reconciliation', 'Budgeting', 'Tax Regulation', 'Brevet A/B', 'SAP', 'Oracle', 'Excel Macros'],
        },
        {
            jobRoleId: jobRoles.financialAnalyst?.id,
            employeePositionId: positions.seniorOfficer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.financial?.id,
            jobRequirement: 'CPA/CFA/CA. 5+ years experience. Expert in Financial Planning & Analysis (FP&A), Treasury, Audit. Tools: SAP S/4HANA, Hyperion, Bloomberg, PowerBI for finance dashboards.',
            jobDescription: 'Lead FP&A and budgeting cycles. Manage treasury and cash flow forecasting. Coordinate with external auditors. Design executive financial dashboards using PowerBI.',
            cityLocation: 'Jakarta',
            minSalary: 14000000,
            maxSalary: 21000000,
            skills: ['FP&A', 'Treasury', 'Audit', 'SAP S/4HANA', 'Hyperion', 'Bloomberg', 'PowerBI'],
        },

        // Human Resources Division - Non-technical positions
        {
            jobRoleId: jobRoles.hrSpecialist?.id,
            employeePositionId: positions.officer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days30?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.humanResources?.id,
            jobRequirement: 'Bachelor in Psychology/Law. 2+ years experience. Skills: Recruitment (End-to-end), Admin, Labor Law basics. Tools: LinkedIn Recruiter, JobStreet, HRIS (Talent/Workday).',
            jobDescription: 'Screen CVs and conduct initial interviews. Manage onboarding/offboarding administration. Update employee database in HRIS. Assist in employee engagement events.',
            cityLocation: 'Jakarta',
            minSalary: 6500000,
            maxSalary: 9500000,
            skills: ['Recruitment', 'Administration', 'Labor Law', 'LinkedIn Recruiter', 'JobStreet', 'HRIS', 'Talent', 'Workday'],
        },
        {
            jobRoleId: jobRoles.hrSpecialist?.id,
            employeePositionId: positions.seniorOfficer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.humanResources?.id,
            jobRequirement: 'Bachelor in Psychology/Law. 5+ years experience. Expert in Talent Management, OD, Compensation & Benefits, Industrial Relations. Tools: Workday/SuccessFactors, Mercer survey data, DISC/MBTI certified.',
            jobDescription: 'Design competency framework and talent development programs. Manage performance appraisal cycles. Oversee compensation structure and salary surveys. Handle complex industrial relation cases.',
            cityLocation: 'Jakarta',
            minSalary: 13000000,
            maxSalary: 19000000,
            skills: ['Talent Management', 'OD', 'Compensation & Benefits', 'Industrial Relations', 'Workday', 'SuccessFactors', 'Mercer', 'DISC', 'MBTI'],
        },

        // FSI and Digital Companies Account Division - Sales positions
        {
            jobRoleId: jobRoles.accountManager?.id,
            employeePositionId: positions.seniorOfficer?.id,
            jobVacancyStatusId: jobVacancyStatus?.id,
            jobVacancyDurationId: durations.days60?.id,
            jobVacancyReasonId: jobVacancyReason?.id,
            employmentTypeId: employmentTypes.pkwtt?.id,
            divisionId: divisions.fsiDigitalCompanies?.id,
            departmentId: departments.fsiAccount1?.id,
            jobRequirement: "Proven work experience as an account executive / account manager in information technology or similar company. Demonstrable ability to communicate, present and influence credibly and effectively at all levels of the organization. Experience in delivering client-focused solutions based on customer needs. Proven ability to manage multiple projects at a time while paying strict attention to detail.",
            jobDescription: "Operate as the lead point of contact for any and all matters specific to our customers. Build and maintain strong, long-lasting customer relationships. Negotiate contracts and close agreements to maximize profit. Develop a trusted advisor relationship with key accounts, customer stakeholders and executive sponsors. Ensure the timely and successful delivery of our solutions according to customer needs and objectives.",
            cityLocation: 'Jakarta',
            minSalary: 15000000,
            maxSalary: 25000000,
            skills: ['Account Management', 'Client Relationship Management', 'Contract Negotiation', 'Solution Selling', 'Customer Success', 'Project Coordination', 'Sales Strategy', 'Presentation Skills'],
        },
    ];

    // Create job vacancies
    let createdCount = 0;
    for (const vacancy of jobVacancies) {
        if (vacancy.jobRoleId && vacancy.employeePositionId && vacancy.divisionId) {
            const { skills, ...vacancyData } = vacancy;
            try {
                // Fetch skill IDs
                const skillIds: string[] = [];
                if (skills && skills.length > 0) {
                    const skillRecords = await prisma.skill.findMany({
                        where: { skillName: { in: skills } }
                    });
                    skillRecords.forEach(s => skillIds.push(s.id));

                    // Log if some skills were not found
                    if (skillRecords.length !== skills.length) {
                        const foundNames = skillRecords.map(s => s.skillName);
                        const missing = skills.filter(s => !foundNames.includes(s));
                        console.warn(`⚠️ Warning: Some skills not found for vacancy ${vacancy.jobRoleId}: ${missing.join(', ')}`);
                    }
                }

                await prisma.jobVacancy.create({
                    data: {
                        ...vacancyData,
                        jobVacancySkills: {
                            create: skillIds.map((skillId) => ({ skillId })),
                        },
                    } as any,
                });
                createdCount++;
                console.log(`✓ Created job vacancy: ${createdCount}/16`);
            } catch (err) {
                console.error(`❌ Failed to create vacancy for ${vacancy.jobRoleId} in ${vacancy.divisionId}:`, err);
            }
        } else {
            console.log(`⚠️  Skipped vacancy due to missing reference data`);
        }
    }

    console.log(`\n✅ Job vacancies seeded successfully! Created ${createdCount} vacancies.`);
}

main()
    .catch((error) => {
        console.error('Error seeding job vacancies:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
