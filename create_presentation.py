import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Theme Colors
    COLOR_BG_DARK = RGBColor(15, 23, 42)       # Slate 900 #0F172A
    COLOR_CARD = RGBColor(30, 41, 59)          # Slate 800 #1E293B
    COLOR_CARD_BORDER = RGBColor(51, 65, 85)   # Slate 700 #334155
    COLOR_PRIMARY = RGBColor(225, 29, 72)      # Rose/Crimson #E11D48
    COLOR_AMBER = RGBColor(245, 158, 11)       # Amber Gold #F59E0B
    COLOR_WHITE = RGBColor(255, 255, 255)      # White
    COLOR_LIGHT_TEXT = RGBColor(203, 213, 225) # Slate 300 #CBD5E1
    COLOR_MUTED = RGBColor(148, 163, 184)      # Slate 400 #94A3B8
    COLOR_GREEN = RGBColor(34, 197, 94)        # Green #22C55E

    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
        )
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_BG_DARK
        bg.line.fill.background() # No border
        return bg

    def add_header(slide, slide_num, title, category="DTU CAMPUS HEALTH CENTER PROJECT"):
        # Category tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(10), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = f"{category.upper()}  ·  SLIDE {slide_num}/10"
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = COLOR_AMBER
        p_cat.font.name = "Arial"

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.5), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE
        p_title.font.name = "Arial"

        # Accent Line under header
        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(11.733), Inches(0.03)
        )
        line.fill.solid()
        line.fill.fore_color.rgb = COLOR_PRIMARY
        line.line.fill.background()

    def add_card(slide, left, top, width, height, title, items, badge=""):
        # Card background
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD
        card.line.color.rgb = COLOR_CARD_BORDER
        card.line.width = Pt(1)

        # Content container
        tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        if badge:
            p_badge = tf.paragraphs[0]
            p_badge.text = badge.upper()
            p_badge.font.size = Pt(10)
            p_badge.font.bold = True
            p_badge.font.color.rgb = COLOR_AMBER
            p_badge.font.name = "Arial"
            p_title = tf.add_paragraph()
        else:
            p_title = tf.paragraphs[0]

        p_title.text = title
        p_title.font.size = Pt(16)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE
        p_title.font.name = "Arial"
        p_title.space_after = Pt(12)

        for item in items:
            p = tf.add_paragraph()
            p.text = f"•  {item}"
            p.font.size = Pt(12)
            p.font.color.rgb = COLOR_LIGHT_TEXT
            p.font.name = "Arial"
            p.space_after = Pt(8)

    # ==========================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Decorative header banner
    badge1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.9), Inches(4.5), Inches(0.45))
    badge1.fill.solid()
    badge1.fill.fore_color.rgb = COLOR_PRIMARY
    badge1.line.fill.background()
    tf_b1 = badge1.text_frame
    p_b1 = tf_b1.paragraphs[0]
    p_b1.text = "DELHI TECHNOLOGICAL UNIVERSITY"
    p_b1.alignment = PP_ALIGN.CENTER
    p_b1.font.size = Pt(12)
    p_b1.font.bold = True
    p_b1.font.color.rgb = COLOR_WHITE

    # Title box
    tbox = s1.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(2.2))
    tf1 = tbox.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "DTU Campus Health Center\nAwareness and Management System"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_WHITE
    p1.font.name = "Arial"

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "A Modern Web-Based Healthcare Information, Appointment Quota & Telemedicine Portal"
    p1_sub.font.size = Pt(16)
    p1_sub.font.color.rgb = COLOR_AMBER
    p1_sub.space_before = Pt(12)

    # Details Card Bottom Left
    card_meta = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.2), Inches(5.6), Inches(2.5))
    card_meta.fill.solid()
    card_meta.fill.fore_color.rgb = COLOR_CARD
    card_meta.line.color.rgb = COLOR_CARD_BORDER
    tf_meta = card_meta.text_frame
    tf_meta.word_wrap = True
    p_m1 = tf_meta.paragraphs[0]
    p_m1.text = "ACADEMIC DETAILS"
    p_m1.font.size = Pt(12)
    p_m1.font.bold = True
    p_m1.font.color.rgb = COLOR_AMBER
    p_m1.space_after = Pt(8)

    meta_items = [
        "Degree: Bachelor of Technology (B.Tech)",
        "Course: B.Tech Project-I (Minor Project)",
        "Department: Computer Science & Engineering",
        "Institution: Delhi Technological University (DTU)",
        "Academic Session: 2026–2027"
    ]
    for mi in meta_items:
        p = tf_meta.add_paragraph()
        p.text = mi
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_LIGHT_TEXT
        p.space_after = Pt(4)

    # Highlights Card Bottom Right
    card_high = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(4.2), Inches(5.7), Inches(2.5))
    card_high.fill.solid()
    card_high.fill.fore_color.rgb = COLOR_CARD
    card_high.line.color.rgb = COLOR_CARD_BORDER
    tf_high = card_high.text_frame
    tf_high.word_wrap = True
    p_h1 = tf_high.paragraphs[0]
    p_h1.text = "KEY HIGHLIGHTS"
    p_h1.font.size = Pt(12)
    p_h1.font.bold = True
    p_h1.font.color.rgb = COLOR_PRIMARY
    p_h1.space_after = Pt(8)

    high_items = [
        "🏥 Real-Time Campus Clinic Information & Timings",
        "🗓️ Quota-Enforced Online Appointment Booking (Max 10/slot)",
        "📹 Peer-to-Peer Telemedicine Room for Hostellers",
        "⚡ 24×7 Cloud Persistence (Google Firebase Firestore)",
        "🎨 Ultra-Modern Dark Glassmorphism + Light Mode UI"
    ]
    for hi in high_items:
        p = tf_high.add_paragraph()
        p.text = hi
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_LIGHT_TEXT
        p.space_after = Pt(4)


    # ==========================================
    # SLIDE 2: INTRODUCTION & BACKGROUND
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, 2, "Introduction & Background: The Need for Digital Campus Health")

    add_card(s2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1),
             "Campus Healthcare Ecosystem", [
                 "Delhi Technological University houses over 15,000+ students across 14+ hostel blocks, research centers, and academic blocks.",
                 "The on-campus Health Center operates as the primary lifeline for outpatient care, routine diagnostics, first-aid, and medical referrals.",
                 "Health center provides certified doctors across General Medicine, Dentistry, Orthopedics, Mental Health, and Physiotherapy.",
                 "However, operations have historically relied on walk-in token registers and paper-based health filing."
             ], "DTU HEALTH INFRASTRUCTURE")

    add_card(s2, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1),
             "The Communication Gap", [
                 "Information about consulting doctor timings and OPD duty schedules is shared via physical notice boards, rarely seen by busy students.",
                 "Bedridden hostellers suffering from fever, sprains, or viral infections face hardship walking all the way across campus to consult a doctor.",
                 "No existing digital mechanism allows hostellers to check doctor availability or queue status before leaving their rooms.",
                 "A centralized, mobile-responsive web platform bridges this gap, maximizing the utility of existing campus medical assets."
             ], "CHALLENGES IDENTIFIED")


    # ==========================================
    # SLIDE 3: PROBLEM STATEMENT
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, 3, "Problem Statement: Real Campus Healthcare Inefficiencies")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "1. Low Student Awareness", [
                 "Students are often completely unaware of the extensive medical facilities and free medicines available on campus.",
                 "Many students visit expensive outside private clinics and hospitals for common ailments like headache, fever, cold, or weakness.",
                 "Traditional physical notice boards fail to reach the digital-first student population."
             ], "AWARENESS BARRIER")

    add_card(s3, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "2. Unmanaged Overcrowding", [
                 "Surges during lecture break hours cause unpredictable queues and chaotic waiting rooms.",
                 "Doctors experience acute burnout due to un-triaged walk-ins arriving simultaneously.",
                 "Absence of slot quotas prevents doctors from allocating dedicated consultation time per student."
             ], "OPERATIONAL CONGESTION")

    add_card(s3, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "3. Hostel Emergencies & Inaccessibility", [
                 "Late-night emergencies in hostels suffer from confusion in locating campus ambulance driver numbers.",
                 "Quarantined students with contagious conditions cannot get advice without exposing others in physical OPD lines.",
                 "Paper prescriptions are easily lost, leading to interrupted medication schedules."
             ], "CRITICAL GAPS")


    # ==========================================
    # SLIDE 4: OBJECTIVES & SCOPE
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, 4, "Project Objectives & Scope: Solving the Core Challenges")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.45),
             "1. Centralized Information & Awareness", [
                 "Provide a single digital portal showcasing operating hours, doctor bios, cabin locations, and specialized clinical departments.",
                 "Promote healthy campus living through digital wellness bulletins and preventative care tips."
             ], "OBJECTIVE I")

    add_card(s4, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.45),
             "2. Quota-Controlled Booking Engine", [
                 "Enable campus doctors to publish availability slots with a strict threshold (Max 10 students/session).",
                 "Eliminate waiting lines by allocating individual digital tokens and real-time status updates."
             ], "OBJECTIVE II")

    add_card(s4, Inches(0.8), Inches(4.5), Inches(5.6), Inches(2.45),
             "3. Digital Prescriptions & Referrals", [
                 "Allow medical officers to draft standardized digital prescriptions with automated dosages and instructions.",
                 "Facilitate seamless patient transfers to specialists (Orthopedics, Dental, Psychiatry) with diagnostic notes."
             ], "OBJECTIVE III")

    add_card(s4, Inches(6.8), Inches(4.5), Inches(5.7), Inches(2.45),
             "4. Telemedicine & Rapid SOS Dispatch", [
                 "Equip the portal with an interactive browser-based video consultation room for remote triage.",
                 "Deploy a one-click hostel ambulance SOS button with simulated sirens and 3-5 minute response tracking."
             ], "OBJECTIVE IV")


    # ==========================================
    # SLIDE 5: MOTIVATION & AICTE NATIONAL CONTEXT
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, 5, "Motivation & National Context: The Higher Education Benchmark")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1),
             "AICTE National Statistics (2025–26)", [
                 "According to official AICTE data, India has approximately 5,875 approved engineering institutions for the 2025–26 academic session.",
                 "Across millions of enrolled engineering students, dedicated digital campus health portals remain virtually non-existent.",
                 "Most institutions continue to rely on manual logbooks, walk-in registers, and physical notice boards.",
                 "DTU, as a leading technological institution, has the opportunity to pioneer a scalable, replicable digital campus healthcare model."
             ], "BENCHMARKING")

    add_card(s5, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1),
             "Why Campus-Specific Healthcare Matters", [
                 "Reduces Student Financial Burden: Prevents unnecessary out-of-pocket spending at private neighborhood clinics.",
                 "Prevents Campus Contagion: Rapid reporting of conjunctivitis, viral flu, or dengue prevents hostel-wide outbreaks.",
                 "Academic Productivity: Timely medical intervention ensures hostellers miss fewer lectures, labs, and mid-term exams.",
                 "Institutional Modernization: Represents a high-impact digital transformation aligned with national digital health initiatives."
             ], "VALUE PROPOSITION")


    # ==========================================
    # SLIDE 6: ALIGNMENT WITH SUSTAINABLE DEVELOPMENT GOALS (SDGs)
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, 6, "Alignment with UN Sustainable Development Goals (SDGs)")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "SDG 3: Good Health & Well-Being", [
                 "Target 3.8: Access to quality essential healthcare services and safe, effective medicines.",
                 "Empowers students with immediate medical guidance, mental health counseling access, and emergency response.",
                 "Improves student awareness of existing free campus clinical consultations and essential drugs."
             ], "GLOBAL GOAL 3")

    add_card(s6, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "SDG 4: Quality Education", [
                 "Target 4.a: Build and upgrade education facilities that are child, disability and gender sensitive.",
                 "Physical and mental wellness directly correlates with student academic performance.",
                 "Minimizes classroom absenteeism by resolving health issues promptly right on campus."
             ], "GLOBAL GOAL 4")

    add_card(s6, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "SDG 9: Industry, Innovation & Infrastructure", [
                 "Target 9.c: Significantly increase access to information and communications technology.",
                 "Applies modern cloud database and web technologies to upgrade institutional health infrastructure.",
                 "Serves as an innovative, paperless operational framework for residential universities across India."
             ], "GLOBAL GOAL 9")


    # ==========================================
    # SLIDE 7: SYSTEM ARCHITECTURE & DUAL-DATABASE DESIGN
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, 7, "System Architecture & Dual-Database Engineering")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1),
             "Google Cloud Firebase Firestore (24×7)", [
                 "Real-Time Push Architecture: Bi-directional event listeners stream updates to student & doctor screens in <10ms.",
                 "24×7 High Availability: Hosted on Google Cloud infrastructure — data remains permanently live even if the laptop is shut down.",
                 "Multi-Device Sync: Instant sync between student smartphones and clinical doctor workstations.",
                 "Collections: `appointments`, `doctor_slots`, `prescriptions`, `campus_notices`, and `emergency_sos`."
             ], "CLOUD REAL-TIME LAYER")

    add_card(s7, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1),
             "Relational Hospital DBMS (SQLite 3)", [
                 "Textbook 3NF Normalization: Clean separation across 11 relational tables (`students`, `doctors`, `departments`, `appointments`, etc.).",
                 "ACID Guarantees: Atomic transaction control ensuring slot capacities never overflow.",
                 "Capacity Constraint: `CHECK (booked_count <= max_capacity)` stops race conditions at the engine level.",
                 "Server-Sent Events (SSE): Local `/api/events` event stream for real-time browser notifications."
             ], "RELATIONAL DBMS LAYER")


    # ==========================================
    # SLIDE 8: KEY FUNCTIONAL MODULES & DEMO FEATURES
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, 8, "Key Functional Modules & Tested Capabilities")

    add_card(s8, Inches(0.8), Inches(1.8), Inches(3.7), Inches(2.45),
             "1. Student Portal & Gating", [
                 "Mandatory profile check (Roll No, Branch, Blood Group, Guardian Contact).",
                 "Interactive dashboard showing upcoming appointments and health alerts."
             ], "STUDENT MODULE")

    add_card(s8, Inches(4.8), Inches(1.8), Inches(3.7), Inches(2.45),
             "2. Quota Booking Engine", [
                 "Strict 10-student cap per doctor consultation window.",
                 "Symptom intake questionnaire and automatic lockout when fully booked."
             ], "OPD MODULE")

    add_card(s8, Inches(8.8), Inches(1.8), Inches(3.7), Inches(2.45),
             "3. Doctor Queue Dashboard", [
                 "Live patient queue cards with urgency badges and token counters.",
                 "One-click action buttons: Call, Refer to Specialist, Mark Done."
             ], "CLINICAL MODULE")

    add_card(s8, Inches(0.8), Inches(4.5), Inches(3.7), Inches(2.45),
             "4. Telehealth Video Room", [
                 "Browser-native WebRTC webcam stream with audio/video toggles.",
                 "In-call real-time text messaging and synchronized prescription notepad."
             ], "TELEMEDICINE")

    add_card(s8, Inches(4.8), Inches(4.5), Inches(3.7), Inches(2.45),
             "5. Digital Rx & Referrals", [
                 "Standardized digital prescription writer with printable/PDF export.",
                 "Specialist transfer slips to Dental, Ortho, Psychiatry departments."
             ], "CLINICAL RECORDS")

    add_card(s8, Inches(8.8), Inches(4.5), Inches(3.7), Inches(2.45),
             "6. 24×7 Ambulance SOS", [
                 "One-tap hostel emergency trigger with simulated audio siren.",
                 "Calculated 3-5 minute arrival window and direct emergency contacts."
             ], "EMERGENCY MODULE")


    # ==========================================
    # SLIDE 9: TECHNOLOGIES, TOOLS & EVALUATION
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, 9, "Technologies, Tools & Implementation Stack")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.45),
             "Frontend & Design Stack", [
                 "HTML5: Clean semantic document layout.",
                 "CSS3: Ultra-Modern Dark Glassmorphism (`#0a0c10`) with instant Light Mode (`#f3f5f9`) toggle controller.",
                 "Vanilla JavaScript (ES6+): Event-driven client controller (`js/app.js`) without heavy third-party framework overhead."
             ], "PRESENTATION LAYER")

    add_card(s9, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.45),
             "Backend, Cloud & Multimedia", [
                 "Cloud Database: Google Cloud Firebase Firestore (`dtu-health-center`).",
                 "Relational DBMS: SQLite 3 (`node:sqlite`) with normalized 3NF DDL.",
                 "Multimedia: HTML5 `getUserMedia` for video and Web Audio API for emergency siren synthesis."
             ], "DATA & PROTOCOLS")

    add_card(s9, Inches(0.8), Inches(4.5), Inches(5.6), Inches(2.45),
             "Development & Hosting Environment", [
                 "IDE & Tools: Visual Studio Code, Git Version Control.",
                 "Target Browsers: Google Chrome, Brave, Firefox, Edge, Safari.",
                 "OS: Windows 10/11 (64-bit) & cross-platform mobile compatibility.",
                 "Cloud Deployment: Vercel serverless edge hosting readiness."
             ], "ENVIRONMENT")

    add_card(s9, Inches(6.8), Inches(4.5), Inches(5.7), Inches(2.45),
             "Evaluation Criteria Satisfied", [
                 "Ease of Use: Consumer-grade, responsive UI with zero training needed.",
                 "Correctness: Reliable appointment workflows and cloud persistence.",
                 "Capacity Enforcement: Rigorously tested 10-patient slot cap.",
                 "Performance: Sub-second page loads and zero-latency tab sync."
             ], "EVALUATION")


    # ==========================================
    # SLIDE 10: EXPECTED OUTCOMES & CONCLUSION
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, 10, "Expected Outcomes & Conclusion")

    add_card(s10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1),
             "Key Project Outcomes", [
                 "1. Elevated Campus Awareness: Students easily discover doctor specializations, OPD hours, and free medicines right from their phones.",
                 "2. Elimination of Overcrowding: Quota-enforced slots (max 10) transform chaotic physical lines into an orderly digital queue.",
                 "3. Care for Quarantined Hostellers: Telehealth video consultations protect infectious patients and preserve campus wellness.",
                 "4. Uninterrupted 24×7 Cloud Security: Google Cloud Firebase ensures data is preserved regardless of local host shutdowns.",
                 "5. Rapid Hostel Crisis Response: One-click ambulance dispatch delivers urgent medical assistance within 3-5 minutes."
             ], "PROJECT IMPACT")

    add_card(s10, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1),
             "Conclusion & Future Scope", [
                 "Conclusion:",
                 "The DTU Campus Health Center Awareness and Management System bridges the critical gap between campus healthcare providers and 15,000+ university residents.",
                 "By harmonizing quota-controlled scheduling, telemedicine, dual-database engineering, and rapid emergency dispatch in a modern UI, it establishes an exemplary digital health model.",
                 "",
                 "Future Enhancements (Phase 2):",
                 "• Automated SMS/WhatsApp notifications via campus gateways.",
                 "• Smart IoT health kiosk integration for automated vitals logging.",
                 "• AI epidemiological forecaster for seasonal outbreak tracking."
             ], "SUMMARY & ROADMAP")

    output_path = os.path.join(os.getcwd(), "DTU_Health_Center_Presentation.pptx")
    prs.save(output_path)
    print(f"[SUCCESS] Presentation generated successfully: {output_path}")

if __name__ == "__main__":
    create_deck()
