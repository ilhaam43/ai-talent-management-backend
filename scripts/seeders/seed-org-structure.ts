import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_talent_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const orgData = {
    "directorates": [
        {
            "id": 1,
            "directorate_name": "President Director and CEO",
            "groups": [
                {
                    "id": 1,
                    "group_name": "Chief Human Resources Officer",
                    "divisions": [
                        {
                            "id": 1,
                            "division_name": "Human Capital Strategy and Experience",
                            "departments": [
                                {
                                    "id": 1,
                                    "department_name": "People Services",
                                    "sub_departments": []
                                },
                                {
                                    "id": 2,
                                    "department_name": "People Partner and Growth",
                                    "sub_departments": [
                                        { "id": 1, "sub_department_name": "Talent Acquisition" },
                                        { "id": 2, "sub_department_name": "People Development" }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": 2,
                    "group_name": "Chief Cloud Officer",
                    "divisions": [
                        {
                            "id": 2,
                            "division_name": "Cloud Solution",
                            "departments": []
                        },
                        {
                            "id": 3,
                            "division_name": "Cloud GTM",
                            "departments": []
                        }
                    ]
                },
                {
                    "id": 3,
                    "group_name": "Chief Cybersecurity Officer",
                    "divisions": [
                        {
                            "id": 4,
                            "division_name": "Cybersecurity Solution",
                            "departments": []
                        },
                        {
                            "id": 5,
                            "division_name": "Cybersecurity GTM",
                            "departments": []
                        }
                    ]
                }
            ],
            "divisions": [
                {
                    "id": 6,
                    "division_name": "CEO Office",
                    "departments": [
                        {
                            "id": 3,
                            "department_name": "Corporate Communication",
                            "sub_departments": []
                        }
                    ]
                },
                {
                    "id": 7,
                    "division_name": "Corporate Secretary, Legal and Regulatory",
                    "departments": [
                        {
                            "id": 4,
                            "department_name": "Legal and Corporate Administration",
                            "sub_departments": []
                        }
                    ]
                },
                {
                    "id": 8,
                    "division_name": "Strategy and Business Development",
                    "departments": [
                        {
                            "id": 5,
                            "department_name": "Business Strategy",
                            "sub_departments": []
                        },
                        {
                            "id": 6,
                            "department_name": "Business Development",
                            "sub_departments": []
                        }
                    ]
                },
                {
                    "id": 9,
                    "division_name": "Internal Audit",
                    "departments": []
                }
            ]
        },

        {
            "id": 2,
            "directorate_name": "Director and Chief Telco Services Officer",
            "divisions": [
                {
                    "id": 10,
                    "division_name": "Infrastructure Solution",
                    "departments": [
                        { "id": 7, "department_name": "Connectivity Solution", "sub_departments": [] },
                        { "id": 8, "department_name": "Infrastructure Development", "sub_departments": [] },
                        { "id": 9, "department_name": "Capacity Management", "sub_departments": [] }
                    ]
                },
                {
                    "id": 11,
                    "division_name": "Corporate IT",
                    "departments": [
                        { "id": 10, "department_name": "IT Application", "sub_departments": [] },
                        { "id": 11, "department_name": "IT Infrastructure", "sub_departments": [] },
                        { "id": 12, "department_name": "Data Management and Advanced Analytics", "sub_departments": [] }
                    ]
                },
                {
                    "id": 12,
                    "division_name": "Information Security",
                    "departments": [
                        { "id": 13, "department_name": "IT Strategy and Governance", "sub_departments": [] },
                        { "id": 14, "department_name": "IT Business Partner", "sub_departments": [] },
                        { "id": 15, "department_name": "Security Policy and Compliance", "sub_departments": [] },
                        { "id": 16, "department_name": "Security Identity Management", "sub_departments": [] },
                        { "id": 17, "department_name": "Security Assessment and Solution", "sub_departments": [] },
                        { "id": 18, "department_name": "Security Analytics and Operations", "sub_departments": [] }
                    ]
                },
                {
                    "id": 13,
                    "division_name": "Project Management and Delivery",
                    "departments": [
                        { "id": 19, "department_name": "Project Management", "sub_departments": [] },
                        {
                            "id": 20,
                            "department_name": "Production Management",
                            "sub_departments": [
                                { "id": 3, "sub_department_name": "Delivery Control 1" },
                                { "id": 4, "sub_department_name": "Delivery Control 2" },
                                { "id": 5, "sub_department_name": "Production Support" }
                            ]
                        },
                        {
                            "id": 21,
                            "department_name": "DOM North Area",
                            "sub_departments": [
                                { "id": 6, "sub_department_name": "Central District Area" },
                                { "id": 7, "sub_department_name": "North and East Area" },
                                { "id": 8, "sub_department_name": "Banten and West Area" }
                            ]
                        },
                        {
                            "id": 22,
                            "department_name": "DOM South Area",
                            "sub_departments": [
                                { "id": 9, "sub_department_name": "Business District Area" },
                                { "id": 10, "sub_department_name": "South Area and South Tangerang" },
                                { "id": 11, "sub_department_name": "South-East Outer Area" }
                            ]
                        }
                    ]
                },
                {
                    "id": 14,
                    "division_name": "Network Operation",
                    "departments": [
                        {
                            "id": 23,
                            "department_name": "TAC Internet",
                            "sub_departments": [
                                { "id": 12, "sub_department_name": "Internet Operation and Production" }
                            ]
                        },
                        {
                            "id": 24,
                            "department_name": "TAC VSAT and Wireless",
                            "sub_departments": [
                                { "id": 13, "sub_department_name": "VSAT Operation and Production" },
                                { "id": 14, "sub_department_name": "Wireless Operation and Performance Management" },
                                { "id": 15, "sub_department_name": "VSAT Performance Management" }
                            ]
                        },
                        {
                            "id": 25,
                            "department_name": "TAC Core Network",
                            "sub_departments": [
                                { "id": 16, "sub_department_name": "Network Operation and Production" },
                                { "id": 17, "sub_department_name": "Network Maintenance and Performance" },
                                { "id": 18, "sub_department_name": "Network Control Center" },
                                { "id": 19, "sub_department_name": "Internet Production and Operation" }
                            ]
                        },
                        {
                            "id": 26,
                            "department_name": "Operation Support",
                            "sub_departments": [
                                { "id": 20, "sub_department_name": "Network and Performance Management" },
                                { "id": 21, "sub_department_name": "Facility Management and Admin" }
                            ]
                        }
                    ]
                },
                {
                    "id": 15,
                    "division_name": "Regional Operation",
                    "departments": [
                        {
                            "id": 27,
                            "department_name": "West Regional Operation",
                            "sub_departments": [
                                { "id": 22, "sub_department_name": "North Sumatera Operation" },
                                { "id": 23, "sub_department_name": "Central Sumatera Operation" },
                                { "id": 24, "sub_department_name": "South Sumatera Operation" }
                            ]
                        },
                        {
                            "id": 28,
                            "department_name": "Central Regional Operation",
                            "sub_departments": [
                                { "id": 25, "sub_department_name": "West Java Operation" },
                                { "id": 26, "sub_department_name": "Central Java & DIY Operation" },
                                { "id": 27, "sub_department_name": "West Kalimantan Operation" },
                                { "id": 28, "sub_department_name": "East Kalimantan Operation" }
                            ]
                        },
                        {
                            "id": 29,
                            "department_name": "East Regional Operation",
                            "sub_departments": [
                                { "id": 29, "sub_department_name": "East Java Operation" },
                                { "id": 30, "sub_department_name": "Balinusra Operation" },
                                { "id": 31, "sub_department_name": "Sulamut Operation" },
                                { "id": 32, "sub_department_name": "Papua Operation" }
                            ]
                        }
                    ]
                },
                {
                    "id": 16,
                    "division_name": "Customer Operation",
                    "departments": [
                        {
                            "id": 30,
                            "department_name": "Service Excellence and Customer Management 1",
                            "sub_departments": [
                                { "id": 33, "sub_department_name": "National Account Customer Management" }
                            ]
                        },
                        { "id": 31, "department_name": "Service Excellence and Customer Management 2", "sub_departments": [] },
                        { "id": 32, "department_name": "Service Excellence and Customer Management 3", "sub_departments": [] },
                        { "id": 33, "department_name": "Service Excellence and Customer Management 4", "sub_departments": [] },
                        {
                            "id": 34,
                            "department_name": "Customer Support Management",
                            "sub_departments": [
                                { "id": 34, "sub_department_name": "Contact Center and Strategic Account Helpdesk" }
                            ]
                        },
                        {
                            "id": 35,
                            "department_name": "Customer Premises and Escalation Management",
                            "sub_departments": [
                                { "id": 35, "sub_department_name": "Service Escalation" },
                                { "id": 36, "sub_department_name": "Service Desk" }
                            ]
                        },
                        { "id": 36, "department_name": "Churn Management", "sub_departments": [] }
                    ]
                }
            ]
        },

        {
            "id": 3,
            "directorate_name": "Director and Chief IT Services Officer",
            "divisions": [
                {
                    "id": 17,
                    "division_name": "Cloud Delivery and Operation",
                    "departments": [
                        {
                            "id": 37,
                            "department_name": "Cloud Engineering",
                            "sub_departments": [
                                { "id": 37, "sub_department_name": "Cloud Service Management" }
                            ]
                        },
                        {
                            "id": 38,
                            "department_name": "Cloud Delivery and Customer Operation",
                            "sub_departments": [
                                { "id": 38, "sub_department_name": "Cloud Customer Operation" }
                            ]
                        },
                        {
                            "id": 39,
                            "department_name": "Cloud Operation",
                            "sub_departments": [
                                { "id": 39, "sub_department_name": "Cloud Sovereign Service Escalation" }
                            ]
                        }
                    ]
                },
                {
                    "id": 18,
                    "division_name": "Cybersecurity Delivery and Operation",
                    "departments": [
                        { "id": 40, "department_name": "Cybersecurity Delivery and Customer Operation", "sub_departments": [] },
                        {
                            "id": 41,
                            "department_name": "Cybersecurity Operation",
                            "sub_departments": [
                                { "id": 40, "sub_department_name": "Cybersecurity Operation Center" },
                                { "id": 41, "sub_department_name": "Cybersecurity Device Management" }
                            ]
                        },
                        { "id": 42, "department_name": "Cybersecurity Assurance", "sub_departments": [] }
                    ]
                },
                {
                    "id": 19,
                    "division_name": "Collaboration Solution",
                    "departments": [
                        { "id": 43, "department_name": "Collaboration Product Consultant", "sub_departments": [] },
                        { "id": 44, "department_name": "Collaboration Product Management", "sub_departments": [] },
                        { "id": 45, "department_name": "App Eng and DevOps", "sub_departments": [] },
                        { "id": 46, "department_name": "IT Professional Services", "sub_departments": [] }
                    ]
                },
                {
                    "id": 20,
                    "division_name": "E-Health Strategic Business Unit",
                    "departments": [
                        { "id": 47, "department_name": "E-Health Sales, Marketing and Solution", "sub_departments": [] },
                        { "id": 48, "department_name": "E-Health Delivery and Operation", "sub_departments": [] }
                    ]
                }
            ]
        },

        {
            "id": 4,
            "directorate_name": "Director and Chief Commercial Officer",
            "divisions": [
                {
                    "id": 21,
                    "division_name": "FSI and Digital Companies Account",
                    "departments": [
                        { "id": 49, "department_name": "FSI and Digital Companies Account 1", "sub_departments": [] },
                        { "id": 50, "department_name": "FSI and Digital Companies Account 2", "sub_departments": [] },
                        { "id": 51, "department_name": "FSI and Digital Companies Account 3", "sub_departments": [] }
                    ]
                },
                {
                    "id": 22,
                    "division_name": "MRD, Regular and Acquisition Account",
                    "departments": [
                        { "id": 52, "department_name": "Manufacturing, Retail and Distribution Acc", "sub_departments": [] },
                        { "id": 53, "department_name": "Transportation and Services Account", "sub_departments": [] },
                        { "id": 54, "department_name": "National Account", "sub_departments": [] }
                    ]
                },
                {
                    "id": 23,
                    "division_name": "Resources and Public Sector Account",
                    "departments": [
                        { "id": 55, "department_name": "Resources Account", "sub_departments": [] },
                        { "id": 56, "department_name": "Public Sector Account 1", "sub_departments": [] },
                        { "id": 57, "department_name": "Public Sector Account 2", "sub_departments": [] }
                    ]
                },
                {
                    "id": 24,
                    "division_name": "Global and Partnership",
                    "departments": [
                        { "id": 58, "department_name": "Global Partner", "sub_departments": [] },
                        { "id": 59, "department_name": "National Partner 1", "sub_departments": [] },
                        { "id": 60, "department_name": "National Partner 2", "sub_departments": [] }
                    ]
                },
                {
                    "id": 25,
                    "division_name": "Regional Commerce",
                    "departments": [
                        { "id": 61, "department_name": "North and Central Sumatera Commercial", "sub_departments": [] },
                        { "id": 62, "department_name": "West Java and Banten Commercial", "sub_departments": [] },
                        { "id": 63, "department_name": "Kalimantan Commercial", "sub_departments": [] },
                        { "id": 64, "department_name": "Sulampua Commercial", "sub_departments": [] },
                        { "id": 65, "department_name": "South Sumatera Commercial", "sub_departments": [] },
                        { "id": 66, "department_name": "DIY, Central and East Java Commercial", "sub_departments": [] },
                        { "id": 67, "department_name": "Balinusra Commercial", "sub_departments": [] }
                    ]
                },
                {
                    "id": 26,
                    "division_name": "Pre Sales",
                    "departments": [
                        { "id": 68, "department_name": "Presales-FSI and Digital Companies Account", "sub_departments": [] },
                        { "id": 69, "department_name": "Presales-Global and Partnership", "sub_departments": [] },
                        { "id": 70, "department_name": "Presales-Regular Commerce 1", "sub_departments": [] },
                        { "id": 71, "department_name": "Presales-Resources and Public Sector Acc", "sub_departments": [] },
                        { "id": 72, "department_name": "Presales-MRD, Regular and Acquisition Acc", "sub_departments": [] },
                        { "id": 73, "department_name": "Presales-Regular Commerce 2", "sub_departments": [] }
                    ]
                },
                {
                    "id": 27,
                    "division_name": "Bidding and Partnership Management",
                    "departments": []
                },
                {
                    "id": 28,
                    "division_name": "Marketing and Commerce Operations",
                    "departments": [
                        { "id": 74, "department_name": "Marketing", "sub_departments": [] },
                        { "id": 75, "department_name": "Commerce Operations", "sub_departments": [] }
                    ]
                }
            ]
        },

        {
            "id": 5,
            "directorate_name": "Director and Chief Financial Officer",
            "divisions": [
                {
                    "id": 29,
                    "division_name": "Finance",
                    "departments": [
                        { "id": 76, "department_name": "Financial Planning and Controlling", "sub_departments": [] },
                        {
                            "id": 77,
                            "department_name": "Accounting",
                            "sub_departments": [
                                { "id": 42, "sub_department_name": "Account Administration and Verification" },
                                { "id": 43, "sub_department_name": "Tax Management" }
                            ]
                        },
                        { "id": 78, "department_name": "Treasury", "sub_departments": [] },
                        { "id": 79, "department_name": "Regional Finance", "sub_departments": [] }
                    ]
                },
                {
                    "id": 30,
                    "division_name": "Supply Chain Management",
                    "departments": [
                        {
                            "id": 80,
                            "department_name": "Procurement Operations",
                            "sub_departments": [
                                { "id": 44, "sub_department_name": "Strategic Sourcing" },
                                { "id": 45, "sub_department_name": "Partner Sourcing" }
                            ]
                        },
                        {
                            "id": 81,
                            "department_name": "Procurement Center of Excellence",
                            "sub_departments": [
                                { "id": 46, "sub_department_name": "Partner Care" },
                                { "id": 47, "sub_department_name": "ASP and System Governance" }
                            ]
                        },
                        { "id": 82, "department_name": "Regional Procurement", "sub_departments": [] },
                        {
                            "id": 83,
                            "department_name": "Asset and Warehouse Management",
                            "sub_departments": [
                                { "id": 48, "sub_department_name": "Asset Management" },
                                { "id": 49, "sub_department_name": "Warehouse Management" }
                            ]
                        },
                        { "id": 84, "department_name": "Facility Management", "sub_departments": [] }
                    ]
                },
                {
                    "id": 31,
                    "division_name": "Billing and Revenue Assurance",
                    "departments": [
                        {
                            "id": 85,
                            "department_name": "Contract, Order Management and Billing",
                            "sub_departments": [
                                { "id": 50, "sub_department_name": "Order and Billing Verification" }
                            ]
                        },
                        { "id": 86, "department_name": "Revenue Assurance", "sub_departments": [] },
                        {
                            "id": 87,
                            "department_name": "Receivable Collection",
                            "sub_departments": [
                                { "id": 51, "sub_department_name": "Collection Management" }
                            ]
                        }
                    ]
                },
                {
                    "id": 32,
                    "division_name": "Risk Enterprise and Compliance",
                    "departments": [
                        { "id": 88, "department_name": "Risk and Compliance", "sub_departments": [] }
                    ]
                }
            ]
        }
    ]
};

async function main() {
    console.log('Starting organizational structure seeding...');

    for (const dir of orgData.directorates) {
        const directorate = await prisma.directorate.create({
            data: {
                directorateName: dir.directorate_name,
            },
        });

        // Handle groups (if any)
        if (dir.groups) {
            for (const grp of dir.groups) {
                const group = await prisma.group.create({
                    data: {
                        directorateId: directorate.id,
                        groupName: grp.group_name,
                    },
                });

                // Handle divisions under group
                if (grp.divisions) {
                    for (const div of grp.divisions) {
                        const division = await prisma.division.create({
                            data: {
                                directorateId: directorate.id,
                                groupId: group.id,
                                divisionName: div.division_name,
                            },
                        });

                        // Handle departments under division
                        if (div.departments) {
                            for (const dept of div.departments) {
                                const department = await prisma.department.create({
                                    data: {
                                        divisionId: division.id,
                                        departmentName: dept.department_name,
                                    },
                                });

                                // Handle sub-departments under department
                                if (dept.sub_departments) {
                                    for (const sub of dept.sub_departments) {
                                        await prisma.subDepartment.create({
                                            data: {
                                                departmentId: department.id,
                                                subDepartmentName: sub.sub_department_name,
                                            },
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Handle divisions directly under directorate
        if (dir.divisions) {
            for (const div of dir.divisions) {
                const division = await prisma.division.create({
                    data: {
                        directorateId: directorate.id,
                        divisionName: div.division_name,
                    },
                });

                // Handle departments under division
                if (div.departments) {
                    for (const dept of div.departments) {
                        const department = await prisma.department.create({
                            data: {
                                divisionId: division.id,
                                departmentName: dept.department_name,
                            },
                        });

                        // Handle sub-departments under department
                        if (dept.sub_departments) {
                            for (const sub of dept.sub_departments) {
                                await prisma.subDepartment.create({
                                    data: {
                                        departmentId: department.id,
                                        subDepartmentName: sub.sub_department_name,
                                    },
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    console.log('Organizational structure seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
