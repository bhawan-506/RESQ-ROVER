/* =====================================================================
   RESQ-ROVER  (NODE-X, BuildFest 2.0, PS-26)  -  OpenSCAD model
   3-RRS Parallel Linkage Architecture (OVERLAPS FIXED)
   ===================================================================== */

$fn = 48;

// ---> CHANGE THIS VARIABLE TO EXPORT YOUR FILES <---
part  = "assembly";   
// OPTIONS: "plate_1_base" | "plate_2_upper" | "plate_3_hardware" | "assembly"

roll  = 0;            // preview only: chassis roll  (deg)
pitch = 0;            // preview only: chassis pitch (deg)

// ------------------------- MEASURE ME -------------------------------
mot_L = 70;  mot_W = 22;  mot_H = 19;   
shaft_from_end = 9;                     
wheel_d = 65;  wheel_w = 26;

srv_L = 22.8;  srv_W = 12.4;            
srv_fl_to_bot = 15.9;                   
srv_tab_hole  = 27.5;                   
srv_off = 5.5;                          
flange_to_arm = 7.5;                    

hole_d = 3.4;  nut_d = 6.5;  nut_h = 2.6; 

// ------------------------- DECK ---------------------------------------
DL = 215;  DW = 215;  DT = 5;  DR = 10; 
grid = 10;
mot_edge = 10;                           

// --------------------- LEVELLING LINKAGE ------------------------------
Rb = 40;      
a  = 30;      
b  = 36;      
Hn = 36;      
zs = 32;      
phis = [60, 180, 300];       
Rp = 66;                     
stud_h = 9;                  
plat_t = 4;                  
PL = 195;  PW = 195;         
arm_t  = 4;                  
wall_h = zs + 12;            

// RADAR TOWER
tx = 84;                    
tw_base = 3;  tw_h = 17;

// ======================= HELPER FUNCTIONS ============================
function Rx3(t) = [[1,0,0],[0,cos(t),-sin(t)],[0,sin(t),cos(t)]];
function Ry3(t) = [[cos(t),0,sin(t)],[0,1,0],[-sin(t),0,cos(t)]];
function tr3(M) = [for (j=[0:2]) [for (i=[0:2]) M[i][j]]];
Rr = tr3(Ry3(pitch) * Rx3(roll)); 

function rvec(p) = [cos(p), sin(p), 0];
function tvec(p) = [-sin(p), cos(p), 0];
function Pj(i)   = [0,0,zs+Hn] + Rr * (Rp * rvec(phis[i])); 
function theta(i) =                                         
    let( p  = phis[i],
         P  = Pj(i),
         S  = [Rb*cos(p), Rb*sin(p), zs],
         d  = P - S,
         pu = d * rvec(p),
         pz = d[2],
         K  = (d*d + a*a - b*b) / (2*a),
         Rn = sqrt(pu*pu + pz*pz) )
    atan2(pz, pu) - acos(max(-1, min(1, K/Rn)));

c_body = Rb - srv_off;       
wy = -flange_to_arm;         
wt = 3;                      
foot_holes = [[c_body-30,-14],[c_body+30,-14],[c_body-15,-31],[c_body+15,-31]];
yc_mot = DW/2 - mot_edge - mot_W/2;     
xe     = DL/2 - 2;                      

module rrect(l, w, r) { offset(r=r) square([l-2*r, w-2*r], center=true); }
module bolt_hole() {  
    translate([0,0,-DT-1]) cylinder(d=hole_d, h=DT+2, $fn=24);
    translate([0,0,-DT-0.01]) cylinder(d=nut_d, h=nut_h, $fn=6);
}

// ============================ DECK ===================================
module motor_ribs_one() {
    for (rx = [xe-17, xe-mot_L+3]) for (sy=[-1,1]) for (s=[-1,1])
        translate([rx, sy*yc_mot + s*(mot_W/2+0.3+1.2) - 1.2, -DT-17])
            cube([14, 2.4, 17.01]);
}
module motor_ribs() { motor_ribs_one(); mirror([1,0,0]) motor_ribs_one(); }

module deck_feature_holes() {
    for (i=[0:2]) rotate([0,0,phis[i]])
        for (h=foot_holes) translate([h[0],h[1],0]) bolt_hole();
    for (sx=[-1,1], sy=[-1,1]) translate([tx+sx*15, sy*12, 0]) bolt_hole();
    zip_slots_one(); mirror([1,0,0]) zip_slots_one();
}
module zip_slots_one() {
    for (rx=[xe-17, xe-mot_L+3]) for (sy=[-1,1]) for (s=[-1,1])
        translate([rx+7-2, sy*yc_mot + s*15.2 - 1, -DT-1]) cube([4, 2, DT+2]);
}

module deck() {
    difference() {
        union() {
            translate([0,0,-DT]) linear_extrude(DT) rrect(DL, DW, DR);
            motor_ribs();
        }
        for (x=[-DL/2+grid:grid:DL/2-grid]) for (y=[-DW/2+grid:grid:DW/2-grid])
            translate([x,y,-DT]) cylinder(d=hole_d, h=DT+1, $fn=24);
        deck_feature_holes();
    }
}

// ======================== SERVO BRACKET ==============================
module servo_bracket() {
    c = c_body;
    difference() {
        union() {
            translate([c-23, wy-wt, 0]) cube([46, wt, wall_h]);         
            translate([c-23, -37, 0]) cube([46, 37+wy, 4]);            
            translate([c-35, -19, 0]) cube([70, 10, 4]);               
            for (s=[-1,1]) hull() {                                    
                translate([c+s*21.5-1.5, wy-wt, 0]) cube([3, wt, wall_h]);
                translate([c+s*21.5-1.5, -37, 0]) cube([3, 0.1, 4]);
            }
            translate([c-(srv_L/2+0.3+3.4), -25.4, zs-(srv_W/2+0.3+2.4)])
                cube([srv_L+0.6+6.8, 25.4+wy-wt+0.01, srv_W+0.6+4.8]);
            translate([c-1.5,0,0]) rotate([90,0,90]) linear_extrude(3)
                polygon([[wy-wt,4],[wy-wt,zs-8.9],[-25.4,zs-8.9],[-37,4]]);
        }
        translate([c-(srv_L+0.6)/2, -30, zs-(srv_W+0.6)/2])
            cube([srv_L+0.6, 30+wy+0.01, srv_W+0.6]);
        for (s=[-1,1]) translate([c+s*srv_tab_hole/2, wy+1, zs])
            rotate([90,0,0]) cylinder(d=1.9, h=11, $fn=16);
        for (h=foot_holes) translate([h[0],h[1],-1]) cylinder(d=hole_d, h=6, $fn=24);
    }
}
module bracket_print() { translate([-c_body,37,0]) servo_bracket(); }

// ============================= ARM ===================================
module arm() {
    difference() {
        linear_extrude(arm_t) hull() { circle(d=11); translate([a,0]) circle(d=9); }
        translate([0,0,-1]) cylinder(d=2.6, h=arm_t+2, $fn=24);            
        translate([0,0,arm_t-2.5]) cylinder(d=7.6, h=2.6, $fn=32);        
        translate([a,0,-1]) cylinder(d=3.3, h=arm_t+2, $fn=24);            
    }
}

// =========================== COUPLER (SOCKET) ========================
cw  = 4.2;  cgap = arm_t + 0.6;  cT = 2*cw + cgap;   
module coupler() {
    difference() {
        union() {
            for (z=[0, cw+cgap]) translate([0,0,z]) linear_extrude(cw)         
                hull() { circle(d=10); translate([12,0]) square([0.1,6], center=true); }
            translate([11, -3, 0]) cube([b-11-5, 6, cT]);                      
            translate([b-6, 0, cT/2]) rotate([0,90,0]) cylinder(d=13, h=11.5); 
        }
        translate([0,0,-1]) cylinder(d=3.3, h=cT+2, $fn=24);                   
        translate([0,0,cT-nut_h+0.01]) cylinder(d=nut_d, h=nut_h+1, $fn=6);    
        translate([b,0,cT/2]) {
            sphere(d=8.3, $fn=40);
            translate([2,0,0]) rotate([0,90,0]) cylinder(d=6.8, h=2, $fn=40);
            translate([3.9,0,0]) rotate([0,90,0]) cylinder(d1=6.8, d2=11.5, h=2.2, $fn=40);
            translate([0.5,-0.6,-8]) cube([10, 1.2, 16]);
            translate([0.5,-8,-0.6]) cube([10, 16, 1.2]);
        }
    }
}

// ============================ BALL STUD ==============================
module stud() {
    difference() {
        union() {
            translate([-9,-5,0]) cube([18,10,3]);
            cylinder(d=3, h=stud_h, $fn=24);
            translate([0,0,stud_h]) sphere(d=8, $fn=48);
        }
        for (s=[-1,1]) translate([s*6,0,-1]) cylinder(d=2.7, h=5, $fn=20);   
    }
}

// =========================== UPPER PLATFORM ==========================
sweep_r = 32;                                 
function near_joint(x,y) = max([for (p=phis) (norm([x,y]-Rp*[cos(p),sin(p)]) < 14 ? 1 : 0)]) == 1;
function in_scallop(x,y) = norm([x-(tx+srv_off), y]) < sweep_r + 4;
module plat_outline() {
    difference() {
        hull() {
            offset(r=10) square([PL-20, PW-20], center=true);
            for (p=phis) translate(Rp*[cos(p), sin(p)]) circle(r=15);
        }
        translate([tx+srv_off, 0]) circle(r=sweep_r, $fn=64);   
    }
}
module platform_plate() {
    difference() {
        translate([0,0,stud_h]) linear_extrude(plat_t) plat_outline();
        for (p=phis) for (s=[-1,1])
            translate(Rp*rvec(p) + s*6*tvec(p)) {
                translate([0,0,stud_h-1]) cylinder(d=hole_d, h=plat_t+2, $fn=24);
                translate([0,0,stud_h+plat_t-1.8]) cylinder(d1=hole_d, d2=6.6, h=1.81, $fn=24);
            }
        for (x=[-80:10:80]) for (y=[-80:10:80])
            if (!near_joint(x,y) && !in_scallop(x,y))
                translate([x,y,stud_h-1]) cylinder(d=hole_d, h=plat_t+2, $fn=20);
    }
}

// ========================== RADAR TOWER ==============================
module radar_tower() {
    difference() {
        union() {
            translate([-20,-15,0]) cube([40,30,tw_base]);
            translate([-18,-8.4,0]) cube([36,16.8,tw_base+tw_h]);
        }
        translate([-(srv_L+0.6)/2, -(srv_W+0.6)/2, -1]) cube([srv_L+0.6, srv_W+0.6, tw_base+tw_h+2]);
        for (s=[-1,1]) translate([s*srv_tab_hole/2, 0, tw_base+tw_h-9]) cylinder(d=1.9, h=10, $fn=16);
        translate([-4, 0, -1]) cube([8, 12, 7]);                           
        for (sx=[-1,1], sy=[-1,1]) translate([sx*15, sy*12, -1]) cylinder(d=hole_d, h=tw_base+2, $fn=24);
    }
}

module sonar_holder() {
    translate([0,-6,0]) difference() {
        union() {
            translate([-25,0,0]) cube([50,3,26]);                    
            translate([-25,3,0]) cube([2.3,8,26]);                   
            translate([22.7,3,0]) cube([2.3,8,26]);
            translate([-25,3,0]) cube([50,8,2.4]);                   
            translate([0,6,-8]) cylinder(d=14, h=8.01, $fn=40);      
        }
        for (s=[-1,1]) translate([s*13.2,-1,13]) rotate([-90,0,0]) cylinder(d=16.8, h=6, $fn=48);
        translate([-22.7,3.01,2.4]) cube([45.4, 9, 30]);             
        translate([0,6,-9]) cylinder(d=7.6, h=3.6, $fn=32);          
        translate([0,6,-9]) cylinder(d=2.6, h=12, $fn=20);           
        translate([0,6,-3]) cylinder(d=4.6, h=6, $fn=24);            
    }
}
module sonar_holder_print() { translate([0,26,6]) rotate([90,0,0]) sonar_holder(); }

// ========================== PCB STANDOFFS ============================
module standoff() { 
    difference() { 
        cylinder(d=7, h=8, $fn=32); 
        translate([0,0,-1]) cylinder(d=3.3, h=10, $fn=20); 
    } 
}

// ========================= ASSEMBLY PREVIEW ==========================
module servo_ghost() {   
    color("dimgray") {
        translate([c_body-srv_L/2, wy-srv_fl_to_bot, zs-srv_W/2]) cube([srv_L, srv_fl_to_bot, srv_W]);
        translate([c_body-16.25, wy, zs-srv_W/2]) cube([32.5, 2.5, srv_W]);
    }
}

module servo_unit(i) {
    th = theta(i);
    A  = [Rb + a*cos(th), 0, zs + a*sin(th)];
    Pg = Pj(i);
    P  = [Pg*rvec(phis[i]), Pg*tvec(phis[i]), Pg[2]];
    be = atan2(P[2]-A[2], P[0]-A[0]);
    rotate([0,0,phis[i]]) {
        color("steelblue") servo_bracket();
        servo_ghost();
        color("orange") translate([Rb,0,zs]) rotate([0,-th,0]) translate([0,arm_t/2,0]) rotate([90,0,0]) arm();
        color("seagreen") translate(A) rotate([0,-be,0]) rotate([90,0,0]) translate([0,0,-cT/2]) coupler();
    }
}

module assembly() {
    color("lightgray") deck();
    for (i=[0:2]) servo_unit(i);
    translate([0,0,zs+Hn]) multmatrix([[Rr[0][0],Rr[0][1],Rr[0][2],0],
                                      [Rr[1][0],Rr[1][1],Rr[1][2],0],
                                      [Rr[2][0],Rr[2][1],Rr[2][2],0],
                                      [0,0,0,1]]) {
        color("khaki") platform_plate();
        color("crimson") for (p=phis)
            translate(Rp*rvec(p) + [0,0,stud_h]) rotate([0,0,p+90]) rotate([180,0,0]) stud();
    }
    color("steelblue") translate([tx,0,0]) radar_tower();
    color("dimgray") translate([tx-srv_L/2+srv_off*0, -srv_W/2, tw_base+tw_h-srv_fl_to_bot]) cube([srv_L, srv_W, srv_fl_to_bot]);
    color("khaki") translate([tx+srv_off,0,tw_base+tw_h+8.5+8]) rotate([0,0,90]) sonar_holder();
    for (sx=[-1,1]) for (sy=[-1,1]) {
        color("gold") translate([sx*(xe-mot_L/2)-mot_L/2, sy*yc_mot-mot_W/2, -DT-mot_H]) cube([mot_L, mot_W, mot_H]);
        color("black") translate([sx*(xe-shaft_from_end), sy*(DW/2-mot_edge+3+wheel_w/2), -DT-mot_H/2])
            rotate([90,0,0]) cylinder(d=wheel_d, h=wheel_w, center=true);
    }
}

// ============================ PRINT LAYOUTS ==========================

// PLATE 3: All hardware cleanly spaced in a grid
module plate_3_hardware() {
    for (i=[0:2]) translate([0, i*55, 0]) bracket_print();
    for (i=[0:2]) translate([60, i*40, 0]) arm();
    for (i=[0:2]) translate([110, i*40, 0]) coupler();
    
    // Increased spacing for the ball studs so they do not touch the couplers
    for (i=[0:2]) translate([175, i*40, 0]) stud();
    
    translate([50, 140, 0]) radar_tower();
    translate([120, 140, 0]) sonar_holder_print();
    
    // Pushed standoffs further out to clear the relocated ball studs
    for (i=[0:7]) translate([210 + (i%2)*15, (i-(i%2))*10, 0]) standoff();
}

// ============================ SELECTOR ===============================
if      (part == "assembly")         assembly();
else if (part == "plate_1_base")     rotate([180,0,0]) deck();
else if (part == "plate_2_upper")    translate([0,0,-stud_h]) platform_plate();
else if (part == "plate_3_hardware") plate_3_hardware();